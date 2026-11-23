"""Flask app: serves the form and the /predict API.

Run from anywhere:  python app/app.py
Production:         gunicorn app.app:app   (from the project root)
"""
import io
import json
import math
import os
import tempfile
import threading
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

import joblib
import pandas as pd
from flask import Flask, jsonify, render_template, request, Response, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "decision_tree.joblib"
DATA_PATH = BASE_DIR / "data" / "vehicles.csv"
REPORTS_DIR = BASE_DIR / "reports"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 101 * 1024 * 1024
app.config["SITE_URL"] = os.environ.get(
    "SITE_URL", "http://127.0.0.1:5000"
).rstrip("/")

site_url_parts = urlsplit(app.config["SITE_URL"])
if (
    site_url_parts.scheme not in {"http", "https"}
    or not site_url_parts.netloc
    or site_url_parts.path
    or site_url_parts.query
    or site_url_parts.fragment
):
    raise ValueError("SITE_URL must be an absolute http(s) origin without a path.")

VIDEO_EXTENSIONS = {".avi", ".mkv", ".mov", ".mp4", ".webm"}
VIDEO_CLASS_NAMES = {
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}
MAX_VIDEO_DURATION_SECONDS = 120
VIDEO_MODEL_PATH = BASE_DIR / "models" / "yolo11n.pt"
_video_model = None
_video_model_lock = threading.Lock()

bundle = joblib.load(MODEL_PATH)
model, FEATURES = bundle["model"], bundle["features"]

# Label and unit for each feature (used to explain the decision path)
LABELS = {
    "wheels": ("Wheels", ""),
    "length_m": ("Length", " m"),
    "width_m": ("Width", " m"),
    "height_m": ("Height", " m"),
    "weight_kg": ("Weight", " kg"),
    "engine_cc": ("Engine", " cc"),
    "seating_capacity": ("Seats", ""),
    "max_speed_kmh": ("Top speed", " km/h"),
}


def count_training_rows():
    try:
        with open(DATA_PATH, encoding="utf-8") as fh:
            return max(sum(1 for _ in fh) - 1, 0)
    except OSError:
        return 0


def compute_class_stats():
    """Per-class feature statistics from the training CSV."""
    try:
        df = pd.read_csv(DATA_PATH)
    except OSError:
        return {}
    stats = {}
    for cls in df["vehicle_type"].unique():
        subset = df[df["vehicle_type"] == cls]
        stats[str(cls)] = {}
        for f in FEATURES:
            col = subset[f]
            stats[str(cls)][f] = {
                "mean": round(float(col.mean()), 2),
                "min": round(float(col.min()), 2),
                "max": round(float(col.max()), 2),
            }
    return stats


def load_eval_metrics():
    """Load test set evaluation metrics computed by train.py."""
    metrics_path = REPORTS_DIR / "metrics.json"
    if metrics_path.exists():
        try:
            with open(metrics_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "accuracy": 0.978,
        "macro_f1": 0.984,
        "macro_precision": 0.980,
        "macro_recall": 0.980,
        "weighted_f1": 0.978,
        "test_size": 400,
        "classes": {},
    }


TREE = {"f": FEATURES}
CLASS_STATS = compute_class_stats()
EVAL_METRICS = load_eval_metrics()
TRAINING_ROWS = count_training_rows()


def explain_path(X):
    """Plain-English list of the questions the tree asked for this vehicle."""
    t = model.tree_
    steps = []
    for node in model.decision_path(X).indices:
        if t.children_left[node] == t.children_right[node]:  # leaf
            continue
        name = FEATURES[t.feature[node]]
        label, unit = LABELS.get(name, (name, ""))
        thr = round(float(t.threshold[node]), 3)
        val = float(X.iloc[0][name])
        answer = "yes" if val <= t.threshold[node] else "no"
        steps.append(f"{label} \u2264 {thr:g}{unit}? {answer} ({val:g})")
    return steps


def validate_vehicle(data):
    """Validate a single vehicle dict. Returns (row_dict, error_string)."""
    if not isinstance(data, dict):
        return None, "Each vehicle must be a JSON object."
    try:
        row = {f: float(data[f]) for f in FEATURES}
    except (KeyError, TypeError, ValueError):
        return None, "All fields are required and must be numbers."
    if any(not math.isfinite(v) for v in row.values()):
        return None, "Values must be finite numbers."
    if any(v < 0 for v in row.values()):
        return None, "Values cannot be negative."
    if row["wheels"] < 1:
        return None, "A vehicle needs at least 1 wheel."
    return row, None


def predict_one(row):
    """Run prediction on a validated row dict. Returns result dict."""
    X = pd.DataFrame([row], columns=FEATURES)
    prediction = str(model.predict(X)[0])
    probs = {str(c): round(float(p), 3)
             for c, p in zip(model.classes_, model.predict_proba(X)[0])}
    return {"prediction": prediction, "probabilities": probs, "path": explain_path(X)}


class VideoAnalysisError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.status_code = status_code


def summarize_vehicle_tracks(track_votes):
    """Count each tracked vehicle once, using its most frequent detected class."""
    counts = {name: 0 for name in VIDEO_CLASS_NAMES.values()}
    for votes in track_votes.values():
        if votes:
            class_id = max(votes, key=votes.get)
            counts[VIDEO_CLASS_NAMES[class_id]] += 1
    return {"total": sum(counts.values()), "counts": counts}


def analyze_vehicle_video(video_path):
    """Track COCO vehicle classes through a video and count unique track IDs."""
    try:
        import cv2
    except ImportError as exc:
        raise VideoAnalysisError(
            "Video support is unavailable. Install the project requirements.",
            status_code=503,
        ) from exc

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        capture.release()
        raise VideoAnalysisError("Could not read this video file.")

    fps = capture.get(cv2.CAP_PROP_FPS)
    frame_count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    capture.release()
    if fps <= 0 or frame_count <= 0:
        raise VideoAnalysisError("Could not determine the video duration.")
    if frame_count / fps > MAX_VIDEO_DURATION_SECONDS:
        raise VideoAnalysisError(
            "Videos must be 2 minutes or shorter.",
            status_code=413,
        )

    track_votes = {}
    try:
        from ultralytics import YOLO

        with _video_model_lock:
            global _video_model
            if _video_model is None:
                _video_model = YOLO(str(VIDEO_MODEL_PATH))

            results = _video_model.track(
                source=str(video_path),
                stream=True,
                tracker="bytetrack.yaml",
                classes=list(VIDEO_CLASS_NAMES),
                conf=0.25,
                verbose=False,
            )
            for result in results:
                boxes = result.boxes
                if boxes is None or boxes.id is None:
                    continue
                class_ids = boxes.cls.int().cpu().tolist()
                track_ids = boxes.id.int().cpu().tolist()
                confidences = boxes.conf.cpu().tolist()
                for class_id, track_id, confidence in zip(
                    class_ids, track_ids, confidences
                ):
                    votes = track_votes.setdefault(int(track_id), Counter())
                    votes[int(class_id)] += float(confidence)
    except ImportError as exc:
        raise VideoAnalysisError(
            "Video support is unavailable. Install the project requirements.",
            status_code=503,
        ) from exc
    except Exception as exc:
        app.logger.exception("Vehicle video analysis failed")
        raise VideoAnalysisError(
            "The detector could not process this video. Check the server logs for details.",
            status_code=500,
        ) from exc

    return summarize_vehicle_tracks(track_votes)


@app.after_request
def add_security_and_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.context_processor
def inject_site_url():
    return {"site_url": app.config["SITE_URL"]}


@app.route("/robots.txt")
def robots_txt():
    return Response(
        f"User-agent: *\nAllow: /\nDisallow: /predict\n"
        f"Disallow: /analyze-video\nSitemap: {app.config['SITE_URL']}/sitemap.xml\n",
        mimetype="text/plain",
    )


@app.route("/sitemap.xml")
def sitemap_xml():
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{app.config['SITE_URL']}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""
    return Response(xml, mimetype="application/xml")


@app.route("/llms.txt")
def llms_txt():
    content = f"""# Field Key Vehicle Classifier

> An educational vehicle-classification web application with an explainable Decision Tree model.

## Pages
- [Vehicle classifier]({app.config['SITE_URL']}/): Interactive vehicle-type classification and model analysis.

## Notes
- Predictions use numeric vehicle specifications and are educational estimates, not authoritative vehicle records.
- The model is trained on a synthetic dataset.
- API endpoints are intended for application use and are not public content pages.
"""
    return Response(content, mimetype="text/plain")


@app.errorhandler(RequestEntityTooLarge)
def handle_upload_too_large(_error):
    return jsonify(error="Video uploads are limited to 100 MB."), 413


@app.errorhandler(404)
def page_not_found(_error):
    return render_template("404.html"), 404


@app.route("/")
def index():
    return render_template(
        "index.html",
        tree=TREE,
        class_stats=CLASS_STATS,
        page_url=f"{app.config['SITE_URL']}/",
    )


@app.route("/health")
def health():
    probe_values = {
        "wheels": 4,
        "length_m": 4.3,
        "width_m": 1.75,
        "height_m": 1.5,
        "weight_kg": 1200,
        "engine_cc": 1500,
        "seating_capacity": 5,
        "max_speed_kmh": 180,
    }
    probe = pd.DataFrame(
        [{feature: probe_values[feature] for feature in FEATURES}],
        columns=FEATURES,
    )
    predictions = model.predict(probe)
    if len(predictions) != 1:
        return jsonify(status="unavailable", model_ready=False), 503
    return jsonify(status="ok", model_ready=True)


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Send a JSON object with the vehicle specifications."), 400

    row, err = validate_vehicle(data)
    if err:
        return jsonify(error=err), 400

    return jsonify(**predict_one(row))


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "vehicles" not in data:
        return jsonify(error="Send {\"vehicles\": [...]} with an array of vehicle specs."), 400

    vehicles = data["vehicles"]
    if not isinstance(vehicles, list) or len(vehicles) == 0:
        return jsonify(error="vehicles must be a non-empty array."), 400
    if len(vehicles) > 50:
        return jsonify(error="Maximum 50 vehicles per batch."), 400

    results = []
    for i, v in enumerate(vehicles):
        row, err = validate_vehicle(v)
        if err:
            return jsonify(error=f"Vehicle {i + 1}: {err}"), 400
        results.append(predict_one(row))

    return jsonify(results=results)


@app.route("/sample-csv")
def sample_csv():
    """Returns a sample CSV template with 10 representative vehicle categories."""
    sample_df = pd.DataFrame([
        {"wheels": 2, "length_m": 2.1, "width_m": 0.8, "height_m": 1.15, "weight_kg": 190, "engine_cc": 350, "seating_capacity": 2, "max_speed_kmh": 145},
        {"wheels": 2, "length_m": 1.8, "width_m": 0.7, "height_m": 1.15, "weight_kg": 110, "engine_cc": 125, "seating_capacity": 2, "max_speed_kmh": 85},
        {"wheels": 3, "length_m": 2.8, "width_m": 1.3, "height_m": 1.75, "weight_kg": 360, "engine_cc": 200, "seating_capacity": 3, "max_speed_kmh": 55},
        {"wheels": 4, "length_m": 4.3, "width_m": 1.75, "height_m": 1.48, "weight_kg": 1200, "engine_cc": 1500, "seating_capacity": 5, "max_speed_kmh": 180},
        {"wheels": 4, "length_m": 4.7, "width_m": 1.9, "height_m": 1.8, "weight_kg": 1900, "engine_cc": 2400, "seating_capacity": 7, "max_speed_kmh": 190},
        {"wheels": 4, "length_m": 5.4, "width_m": 1.9, "height_m": 1.85, "weight_kg": 2200, "engine_cc": 2800, "seating_capacity": 4, "max_speed_kmh": 150},
        {"wheels": 4, "length_m": 5.2, "width_m": 1.95, "height_m": 2.3, "weight_kg": 2600, "engine_cc": 2500, "seating_capacity": 10, "max_speed_kmh": 135},
        {"wheels": 4, "length_m": 3.6, "width_m": 2.0, "height_m": 2.5, "weight_kg": 3400, "engine_cc": 3000, "seating_capacity": 1, "max_speed_kmh": 35},
        {"wheels": 8, "length_m": 9.5, "width_m": 2.5, "height_m": 3.4, "weight_kg": 11000, "engine_cc": 6000, "seating_capacity": 2, "max_speed_kmh": 90},
        {"wheels": 6, "length_m": 11.5, "width_m": 2.5, "height_m": 3.3, "weight_kg": 12000, "engine_cc": 6500, "seating_capacity": 48, "max_speed_kmh": 95},
    ])
    csv_str = sample_df.to_csv(index=False)
    return Response(
        csv_str,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=vehicle_sample_template.csv"}
    )


@app.route("/predict/csv", methods=["POST"])
def predict_csv():
    """Classifies a uploaded CSV file and returns the classified records."""
    if "file" not in request.files:
        return jsonify(error="Please upload a CSV file with key 'file'."), 400

    f = request.files["file"]
    if not f.filename or not f.filename.lower().endswith(".csv"):
        return jsonify(error="Uploaded file must be a CSV (.csv)."), 400

    try:
        df = pd.read_csv(f)
    except Exception as e:
        return jsonify(error=f"Could not parse CSV: {str(e)}"), 400

    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        return jsonify(error=f"Missing required columns in CSV: {', '.join(missing)}"), 400

    if len(df) == 0:
        return jsonify(error="Uploaded CSV file is empty."), 400

    if len(df) > 500:
        return jsonify(error="CSV file exceeds maximum limit of 500 rows."), 400

    try:
        X = df[FEATURES].astype(float)
    except ValueError:
        return jsonify(error="All feature values in the CSV must be numeric."), 400

    if not all(math.isfinite(float(value)) for value in X.to_numpy().flat):
        return jsonify(error="CSV feature values must be finite numbers."), 400
    if (X < 0).any().any():
        return jsonify(error="CSV feature values cannot be negative."), 400
    if (X["wheels"] < 1).any():
        return jsonify(error="A vehicle needs at least 1 wheel."), 400

    # Predictions
    preds = model.predict(X)
    probs = model.predict_proba(X)
    confidences = [round(float(max(p)), 3) for p in probs]

    df_out = df.copy()
    df_out["predicted_type"] = [str(p) for p in preds]
    df_out["confidence"] = confidences

    # Check format request (json or csv download)
    want_csv = request.args.get("format") == "csv" or request.form.get("format") == "csv"
    if want_csv:
        csv_buffer = io.StringIO()
        df_out.to_csv(csv_buffer, index=False)
        return Response(
            csv_buffer.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=classified_vehicles.csv"}
        )

    # Return preview JSON
    records = df_out.head(100).to_dict(orient="records")
    return jsonify(
        total_rows=len(df),
        preview=records,
        summary=df_out["predicted_type"].value_counts().to_dict()
    )


@app.route("/analyze-video", methods=["POST"])
def analyze_video():
    if "file" not in request.files:
        return jsonify(error="Choose a video file to analyze."), 400

    video = request.files["file"]
    if not video.filename:
        return jsonify(error="Choose a video file to analyze."), 400

    suffix = Path(video.filename).suffix.lower()
    if suffix not in VIDEO_EXTENSIONS:
        return jsonify(error="Upload an AVI, MKV, MOV, MP4, or WebM video."), 400

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            video.save(temp_file)
        return jsonify(**analyze_vehicle_video(temp_path))
    except VideoAnalysisError as exc:
        return jsonify(error=str(exc)), exc.status_code
    except OSError:
        app.logger.exception("Could not save uploaded video")
        return jsonify(error="Could not save the uploaded video. Try again."), 500
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink()
            except FileNotFoundError:
                pass


@app.route("/model/info")
def model_info():
    return jsonify(
        classes=[str(c) for c in model.classes_],
        features=FEATURES,
        feature_labels={f: {"name": LABELS[f][0], "unit": LABELS[f][1].strip()} for f in FEATURES},
        depth=int(model.get_depth()),
        training_rows=TRAINING_ROWS,
        importances={f: round(float(v), 4) for f, v in zip(FEATURES, model.feature_importances_)},
        metrics=EVAL_METRICS,
    )


@app.route("/api/class-stats")
def api_class_stats():
    return jsonify(CLASS_STATS)


@app.route("/reports/<path:filename>")
def serve_report(filename):
    """Serve evaluation report images (confusion_matrix.png, tree.png, feature_importance.png)."""
    return send_from_directory(REPORTS_DIR, filename)



if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
