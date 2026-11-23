"""Train, tune, evaluate and save the Decision Tree classifier.

Run from anywhere:  python src/train.py
"""
from pathlib import Path
import json

import joblib
import matplotlib

matplotlib.use("Agg")  # no display needed
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import ConfusionMatrixDisplay, classification_report
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.tree import DecisionTreeClassifier, plot_tree

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "vehicles.csv"
MODEL_PATH = BASE_DIR / "models" / "decision_tree.joblib"
REPORTS_DIR = BASE_DIR / "reports"

FEATURES = ["wheels", "length_m", "width_m", "height_m",
            "weight_kg", "engine_cc", "seating_capacity", "max_speed_kmh"]
TARGET = "vehicle_type"


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"{DATA_PATH} not found. Run: python src/generate_data.py")

    REPORTS_DIR.mkdir(exist_ok=True)
    MODEL_PATH.parent.mkdir(exist_ok=True)

    df = pd.read_csv(DATA_PATH).dropna()
    X, y = df[FEATURES], df[TARGET]

    # Split first, so tuning never sees the test set
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    param_grid = {
        "criterion": ["gini", "entropy"],
        "max_depth": [3, 4, 5, 6, 8, None],
        "min_samples_leaf": [1, 2, 5, 10],
    }
    grid = GridSearchCV(DecisionTreeClassifier(random_state=42),
                        param_grid, cv=5, scoring="f1_macro")
    grid.fit(X_train, y_train)
    model = grid.best_estimator_

    print("Best params:", grid.best_params_)
    print(f"Best CV macro-F1: {grid.best_score_:.3f}")

    y_pred = model.predict(X_test)
    test_acc = float((y_pred == y_test).mean())
    print(f"\nTest accuracy: {test_acc:.3f}\n")
    report_dict = classification_report(y_test, y_pred, output_dict=True)
    print(classification_report(y_test, y_pred))

    metrics_summary = {
        "accuracy": round(test_acc, 4),
        "macro_f1": round(report_dict["macro avg"]["f1-score"], 4),
        "macro_precision": round(report_dict["macro avg"]["precision"], 4),
        "macro_recall": round(report_dict["macro avg"]["recall"], 4),
        "weighted_f1": round(report_dict["weighted avg"]["f1-score"], 4),
        "test_size": len(y_test),
        "classes": {
            cls: {
                "precision": round(data["precision"], 3),
                "recall": round(data["recall"], 3),
                "f1_score": round(data["f1-score"], 3),
                "support": int(data["support"]),
            }
            for cls, data in report_dict.items()
            if cls not in ("accuracy", "macro avg", "weighted avg")
        },
    }
    with open(REPORTS_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)

    # Confusion matrix
    ConfusionMatrixDisplay.from_estimator(model, X_test, y_test, xticks_rotation=45)
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "confusion_matrix.png", dpi=150)
    plt.close()

    # Tree visualisation
    plt.figure(figsize=(24, 11))
    plot_tree(model, feature_names=FEATURES, class_names=list(model.classes_),
              filled=True, fontsize=6)
    plt.savefig(REPORTS_DIR / "tree.png", dpi=150)
    plt.close()

    # Feature importances
    importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values()
    importances.plot(kind="barh", title="Feature importance")
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "feature_importance.png", dpi=150)
    plt.close()

    joblib.dump({"model": model, "features": FEATURES}, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
