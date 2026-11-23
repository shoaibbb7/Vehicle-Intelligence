import json
import re

import pytest

from app.app import app, summarize_vehicle_tracks

CAR = {"wheels": 4, "length_m": 4.2, "width_m": 1.75, "height_m": 1.5,
       "weight_kg": 1200, "engine_cc": 1500, "seating_capacity": 5, "max_speed_kmh": 180}
BIKE = {"wheels": 2, "length_m": 2.1, "width_m": 0.8, "height_m": 1.15,
        "weight_kg": 190, "engine_cc": 350, "seating_capacity": 2, "max_speed_kmh": 145}
SCOOTER = {"wheels": 2, "length_m": 1.8, "width_m": 0.7, "height_m": 1.15,
           "weight_kg": 110, "engine_cc": 125, "seating_capacity": 2, "max_speed_kmh": 85}
BUS = {"wheels": 6, "length_m": 11.0, "width_m": 2.5, "height_m": 3.2,
       "weight_kg": 10000, "engine_cc": 6000, "seating_capacity": 45, "max_speed_kmh": 95}
SUV = {"wheels": 4, "length_m": 4.6, "width_m": 1.9, "height_m": 1.8,
       "weight_kg": 1900, "engine_cc": 2200, "seating_capacity": 7, "max_speed_kmh": 190}
TRUCK = {"wheels": 8, "length_m": 9.5, "width_m": 2.5, "height_m": 3.4,
         "weight_kg": 11000, "engine_cc": 6000, "seating_capacity": 2, "max_speed_kmh": 90}
TRACTOR = {"wheels": 4, "length_m": 3.6, "width_m": 2.0, "height_m": 2.5,
           "weight_kg": 3400, "engine_cc": 3000, "seating_capacity": 1, "max_speed_kmh": 35}
PICKUP = {"wheels": 4, "length_m": 5.4, "width_m": 1.9, "height_m": 1.85,
          "weight_kg": 2200, "engine_cc": 2800, "seating_capacity": 4, "max_speed_kmh": 150}
VAN = {"wheels": 4, "length_m": 5.2, "width_m": 1.95, "height_m": 2.3,
       "weight_kg": 2600, "engine_cc": 2500, "seating_capacity": 10, "max_speed_kmh": 135}


@pytest.fixture
def client():
    app.config["TESTING"] = True
    return app.test_client()


def test_home_page(client):
    assert client.get("/").status_code == 200


def test_health_endpoint_runs_model_inference(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "model_ready": True}


def test_navigation_can_be_hidden(client):
    html = client.get("/").get_data(as_text=True)
    assert 'id="sidebar"' in html
    assert 'id="navToggle"' in html
    assert 'aria-controls="sidebar"' in html


def test_homepage_discloses_synthetic_data_and_privacy(client):
    html = client.get("/").get_data(as_text=True)
    assert 'id="data-privacy"' in html
    assert 'href="#data-privacy"' in html
    assert "synthetic rows" in html
    assert "local storage" in html
    assert html.index("</details>", html.index('id="learn-more"')) < html.index('id="metrics"')


def test_video_track_summary_counts_unique_tracks_by_majority_class():
    summary = summarize_vehicle_tracks({
        10: {3: 2.1, 2: 0.7},
        11: {2: 1.8},
        12: {1: 1.0},
    })
    assert summary["total"] == 3
    assert summary["counts"]["motorcycle"] == 1
    assert summary["counts"]["car"] == 1
    assert summary["counts"]["bicycle"] == 1
    assert summary["counts"]["bus"] == 0


def test_video_upload_rejects_unsupported_extension(client):
    import io

    response = client.post(
        "/analyze-video",
        data={"file": (io.BytesIO(b"not a video"), "notes.txt")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "AVI" in response.get_json()["error"]


def test_video_upload_rejects_unreadable_video(client):
    import io

    response = client.post(
        "/analyze-video",
        data={"file": (io.BytesIO(b"not a video"), "sample.mp4")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "Could not read" in response.get_json()["error"]


@pytest.mark.parametrize("payload,expected", [(CAR, "Car"), (BIKE, "Bike"), (BUS, "Bus")])
def test_valid_predictions(client, payload, expected):
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    body = res.get_json()
    assert body["prediction"] == expected
    assert abs(sum(body["probabilities"].values()) - 1) < 0.01


def test_missing_field(client):
    bad = {k: v for k, v in CAR.items() if k != "weight_kg"}
    assert client.post("/predict", json=bad).status_code == 400


def test_non_numeric(client):
    assert client.post("/predict", json={**CAR, "wheels": "four"}).status_code == 400


def test_negative(client):
    assert client.post("/predict", json={**CAR, "length_m": -1}).status_code == 400


def test_nan_rejected(client):
    assert client.post("/predict", json={**CAR, "length_m": "nan"}).status_code == 400


def test_non_object_body(client):
    assert client.post("/predict", json=[1, 2, 3]).status_code == 400
    assert client.post("/predict", data="not json").status_code == 400


SECTIONS = [
    "Class schemes", "Applications", "Common challenges",
    "Evaluation metrics", "Well-known datasets", "Future directions",
]


def test_page_has_all_sections(client):
    html = client.get("/").get_data(as_text=True)
    assert "Field Key" in html
    for title in SECTIONS:
        assert title in html


def test_removed_sections_and_links_are_absent(client):
    html = client.get("/").get_data(as_text=True)
    for section_id in ["about", "pipeline", "build", "approaches"]:
        assert f'id="{section_id}"' not in html
        assert f'href="#{section_id}"' not in html
    assert "Main approaches" not in html
    assert "Typical pipeline" not in html
    assert "Where this project fits" not in html
    javascript = client.get("/static/js/main.js").get_data(as_text=True)
    assert "Pipeline" not in javascript
    assert "This build" not in javascript


def test_dark_mode_toggle_is_removed(client):
    html = client.get("/").get_data(as_text=True)
    javascript = client.get("/static/js/main.js").get_data(as_text=True)
    assert 'id="themeBtn"' not in html
    assert "Toggle dark mode" not in html
    assert "fk-theme" not in javascript
    assert "initTheme" not in javascript


def test_page_embeds_classifier_fields_and_assets(client):
    html = client.get("/").get_data(as_text=True)
    assert "window.TREE" in html
    assert '"f"' in html
    assert client.get("/static/css/style.css").status_code == 200
    js = client.get("/static/js/main.js")
    assert js.status_code == 200
    text = js.get_data(as_text=True)
    for term in ["MIO-TCD", "UA-DETRAC", "re-identification"]:
        assert term.lower() in (html + text).lower()


def test_prediction_includes_decision_path(client):
    body = client.post("/predict", json=CAR).get_json()
    assert isinstance(body["path"], list) and body["path"]
    assert all("?" in step for step in body["path"])


# ═══════ NEW: Batch prediction tests ═══════

def test_batch_valid(client):
    res = client.post("/predict/batch", json={"vehicles": [CAR, BIKE, BUS]})
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["results"]) == 3
    assert body["results"][0]["prediction"] == "Car"
    assert body["results"][1]["prediction"] == "Bike"
    assert body["results"][2]["prediction"] == "Bus"


def test_batch_empty(client):
    res = client.post("/predict/batch", json={"vehicles": []})
    assert res.status_code == 400


def test_batch_missing_key(client):
    res = client.post("/predict/batch", json={"items": [CAR]})
    assert res.status_code == 400


def test_batch_invalid_vehicle(client):
    bad = {k: v for k, v in CAR.items() if k != "wheels"}
    res = client.post("/predict/batch", json={"vehicles": [CAR, bad]})
    assert res.status_code == 400
    assert "Vehicle 2" in res.get_json()["error"]


def test_batch_too_large(client):
    res = client.post("/predict/batch", json={"vehicles": [CAR] * 51})
    assert res.status_code == 400
    assert "50" in res.get_json()["error"]


def test_vehicle_comparison_feature_removed(client):
    homepage = client.get("/").get_data(as_text=True)
    assert "Compare two vehicles" not in homepage
    assert 'id="compare-section"' not in homepage
    assert client.post("/compare", json={"vehicle_a": CAR, "vehicle_b": SUV}).status_code == 404


# ═══════ NEW: Model info endpoint tests ═══════

def test_model_info(client):
    res = client.get("/model/info")
    assert res.status_code == 200
    body = res.get_json()
    assert "classes" in body
    assert len(body["classes"]) >= 4
    assert "features" in body
    assert "depth" in body
    assert body["depth"] > 0
    assert "feature_labels" in body
    assert "wheels" in body["feature_labels"]
    assert "importances" in body
    assert all(0 <= v <= 1 for v in body["importances"].values())


# ═══════ NEW: Class stats endpoint tests ═══════

def test_class_stats(client):
    res = client.get("/api/class-stats")
    assert res.status_code == 200
    body = res.get_json()
    assert "Car" in body
    assert "wheels" in body["Car"]
    assert "mean" in body["Car"]["wheels"]
    assert "min" in body["Car"]["wheels"]
    assert "max" in body["Car"]["wheels"]


# ═══════ NEW: CORS headers test ═══════

def test_cors_headers(client):
    res = client.get("/")
    assert res.headers.get("Access-Control-Allow-Origin") == "*"


# ═══════ NEW: CSV Batch tests ═══════

def test_sample_csv_download(client):
    res = client.get("/sample-csv")
    assert res.status_code == 200
    assert res.mimetype == "text/csv"
    assert "wheels" in res.get_data(as_text=True)


def test_predict_csv_upload_preview(client):
    import io
    csv_data = (
        "wheels,length_m,width_m,height_m,weight_kg,engine_cc,seating_capacity,max_speed_kmh\n"
        "4,4.2,1.75,1.5,1200,1500,5,180\n"
        "2,2.1,0.8,1.15,190,350,2,145\n"
    )
    data = {"file": (io.BytesIO(csv_data.encode("utf-8")), "test.csv")}
    res = client.post("/predict/csv", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    body = res.get_json()
    assert body["total_rows"] == 2
    assert len(body["preview"]) == 2
    assert body["preview"][0]["predicted_type"] == "Car"
    assert body["preview"][1]["predicted_type"] == "Bike"


@pytest.mark.parametrize(
    "row,error",
    [
        ("4,inf,1.75,1.5,1200,1500,5,180", "finite numbers"),
        ("4,nan,1.75,1.5,1200,1500,5,180", "finite numbers"),
        ("4,-4.2,1.75,1.5,1200,1500,5,180", "cannot be negative"),
        ("0,4.2,1.75,1.5,1200,1500,5,180", "at least 1 wheel"),
    ],
)
def test_predict_csv_rejects_invalid_features(client, row, error):
    import io

    csv_data = (
        "wheels,length_m,width_m,height_m,weight_kg,engine_cc,seating_capacity,max_speed_kmh\n"
        f"{row}\n"
    )
    data = {"file": (io.BytesIO(csv_data.encode("utf-8")), "invalid.csv")}
    response = client.post(
        "/predict/csv", data=data, content_type="multipart/form-data"
    )

    assert response.status_code == 400
    assert error in response.get_json()["error"]


def test_predict_csv_download_format(client):
    import io
    csv_data = (
        "wheels,length_m,width_m,height_m,weight_kg,engine_cc,seating_capacity,max_speed_kmh\n"
        "4,4.2,1.75,1.5,1200,1500,5,180\n"
    )
    data = {"file": (io.BytesIO(csv_data.encode("utf-8")), "test.csv"), "format": "csv"}
    res = client.post("/predict/csv?format=csv", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    assert res.mimetype == "text/csv"
    assert "predicted_type" in res.get_data(as_text=True)


# ═══════ NEW: Page has new sections ═══════

def test_page_has_new_sections(client):
    html = client.get("/").get_data(as_text=True)
    assert "Count vehicles in a video" in html
    assert 'id="videoFileInput"' in html
    assert "Feature sensitivity" in html
    assert "Recent classifications" in html
    assert "window.CLASS_STATS" in html
    assert "Surprise me" in html
    assert "Corolla" in html
    assert "Fortuner" in html



def test_serve_report_images(client):
    for filename in ["confusion_matrix.png", "tree.png", "feature_importance.png"]:
        res = client.get(f"/reports/{filename}")
        assert res.status_code == 200
        assert res.mimetype == "image/png"


def test_model_info_includes_evaluation_metrics(client):
    res = client.get("/model/info")
    assert res.status_code == 200
    body = res.get_json()
    assert "metrics" in body
    assert "accuracy" in body["metrics"]
    assert body["metrics"]["accuracy"] >= 0.90
    assert "macro_f1" in body["metrics"]
    assert "classes" in body["metrics"]


def test_page_renders_evaluation_artifacts_without_report_sections(client):
    html = client.get("/").get_data(as_text=True)
    assert "Confusion Matrix" in html
    assert "confusion_matrix.png" in html
    assert "feature_importance.png" in html
    assert "tree.png" in html
    assert "Project Report" not in html
    assert "Milestone 1" not in html
    assert 'id="documentation"' not in html
    assert 'id="milestone-tracker"' not in html


def test_security_headers(client):
    res = client.get("/")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_robots_and_sitemap(client):
    r_robots = client.get("/robots.txt")
    assert r_robots.status_code == 200
    assert "User-agent" in r_robots.get_data(as_text=True)

    r_sitemap = client.get("/sitemap.xml")
    assert r_sitemap.status_code == 200
    assert "urlset" in r_sitemap.get_data(as_text=True)


def test_public_pages_have_unique_seo_metadata_and_one_heading(client):
    pages = ["/", "/missing-page"]
    rendered = [client.get(path) for path in pages]
    assert [response.status_code for response in rendered] == [200, 404]

    titles = []
    descriptions = []
    for response in rendered:
        html = response.get_data(as_text=True)
        titles.append(re.search(r"<title>(.*?)</title>", html).group(1))
        descriptions.append(
            re.search(r'<meta name="description" content="(.*?)"', html).group(1)
        )
        assert len(re.findall(r"<h1\b", html)) == 1
    assert len(set(titles)) == len(titles)
    assert len(set(descriptions)) == len(descriptions)


def test_homepage_seo_assets_and_images_have_alt_text(client):
    html = client.get("/").get_data(as_text=True)
    assert 'rel="canonical" href="http://127.0.0.1:5000/"' in html
    assert 'property="og:image"' in html
    assert 'name="twitter:image"' in html
    assert client.get("/static/favicon.svg").status_code == 200
    social_image = client.get("/static/images/social-card.png")
    assert social_image.status_code == 200
    assert social_image.mimetype == "image/png"

    image_tags = re.findall(r"<img\b[^>]*>", html)
    assert image_tags
    assert all(re.search(r'\balt="[^"]+"', tag) for tag in image_tags)

    schema = re.search(
        r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL
    )
    assert schema
    assert json.loads(schema.group(1))["@type"] == "SoftwareApplication"


def test_removed_report_page_and_clean_sitemap_entry(client):
    assert client.get("/project-report").status_code == 404
    assert client.get("/download-report").status_code == 404
    assert client.get("/llms.txt").status_code == 200

    sitemap = client.get("/sitemap.xml").get_data(as_text=True)
    assert "/project-report" not in sitemap


def test_public_urls_follow_configured_domain(client):
    original = app.config["SITE_URL"]
    app.config["SITE_URL"] = "https://vehicles.example"
    try:
        homepage = client.get("/").get_data(as_text=True)
        assert 'rel="canonical" href="https://vehicles.example/"' in homepage
        assert "https://vehicles.example/static/images/social-card.png" in homepage
        assert "https://vehicles.example/sitemap.xml" in client.get(
            "/robots.txt"
        ).get_data(as_text=True)
        sitemap = client.get("/sitemap.xml").get_data(as_text=True)
        llms = client.get("/llms.txt").get_data(as_text=True)
        assert "/project-report" not in sitemap
        assert "/project-report" not in llms
    finally:
        app.config["SITE_URL"] = original
