# Vehicle Type Classification System using Decision Tree
## Model Development, Testing and Documentation

An end-to-end Machine Learning web application and REST API that classifies road vehicles into 10 categories using a Decision Tree classifier (scikit-learn) trained on physical and technical specifications: **wheels, length, width, height, curb weight, engine displacement, seating capacity, and top speed**.

---

## 🚀 Key Highlights & Performance

- **10 Vehicle Classes:** Bike, Scooter, Auto-Rickshaw, Car, SUV, Pickup, Van, Tractor, Truck, and Bus.
- **Evaluation on synthetic data:** **97.75%** accuracy and **0.9774** macro-F1 on a stratified 400-row held-out test split. Five-fold cross-validation is used for model selection; real-world performance has not been established.
- **Explainable Decision Logic:** Explains every prediction with an explicit step-by-step decision rule traversal.
- **Editorial Navy & Beige Design:** Responsive, accessible UI (`#0f2b5c` deep navy accent, `#f7f3ea` warm beige canvas, `#0e203f` midnight navy panels).
- **Transparent evaluation:** Confusion matrix, feature importance, tree visualization, and per-class test results are available in the web interface.
- **Automated tests:** Run with `python -m pytest tests/`.

---

## 📁 Project Structure

```
vehicle-classifier/
├── data/
│   └── vehicles.csv          # 2,000 labelled vehicle records across 10 classes
├── models/
│   ├── decision_tree.joblib  # Trained scikit-learn Decision Tree model
│   └── yolo11n.pt            # Pretrained YOLO tracking model (auto-downloaded)
├── src/
│   ├── generate_data.py      # Labelled dataset generator with bounded distributions
│   └── train.py              # Hyperparameter grid search, 5-fold CV, report plots
├── reports/
│   ├── confusion_matrix.png  # 10-class holdout confusion matrix plot
│   ├── feature_importance.png# Feature importance ranking bar chart
│   ├── tree.png              # Visual decision tree graph (depth = 6)
│   ├── metrics.json          # Precision, recall, and F1-score export
│   └── PROJECT_REPORT.md     # Comprehensive project documentation
├── app/
│   ├── app.py                # Flask REST API, inference pipeline, security headers
│   ├── templates/index.html  # Responsive vehicle-classifier dashboard
│   └── static/
│       ├── css/style.css     # Navy & Beige responsive design system
│       └── js/main.js        # Interactive canvas, radar chart, sliders, batch logic
├── tests/
│   └── test_api.py           # API and integration tests
├── requirements.txt
└── README.md
```

---

## 🛠️ Setup & Execution

### 1. Environment Setup

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Retrain Model & Generate Evaluation Artifacts

```bash
python src/generate_data.py   # Generate data/vehicles.csv (2,000 records)
python src/train.py           # Tune, evaluate, and save model & report plots
```

### 3. Run the Web Application

```bash
python app/app.py
```
Open your browser at **`http://127.0.0.1:5000`**.

### 4. Run Test Suite

```bash
python -m pytest tests/ -v
```

---

## 🌐 Web Interface Capabilities

1. **Interactive Vehicle Classifier:** Direct attribute input with real-time prediction, confidence ring, radar specification comparison, and decision rule pathway.
2. **21 Vehicle Presets:** Quick-test real-world vehicles (Toyota Corolla, Fortuner, Honda Civic, Hero Splendor, Honda Activa, Eicher Pro, Volvo 9700 Bus, John Deere Tractor).
3. **Model Performance Hub (`#metrics`):** 4 KPI summary cards (Accuracy, Macro-F1, Precision, Recall), interactive tabs for Confusion Matrix, Feature Importance, and Decision Tree graph with click-to-zoom lightbox modal.
4. **Training-data guidance:** Input ranges are shown from the generated training data, with a warning for out-of-range values.
5. **Batch CSV Drag & Drop (`#batch-section`):** Upload CSV files up to 500 rows, preview classifications instantly, and download the tagged output.
6. **Real-Time Sensitivity Sliders (`#sensitivity-section`):** Test attribute thresholds interactively to observe real-time classification changes.
7. **Video Vehicle Counter (`#video-section`):** Upload short traffic videos to count and track moving vehicles using YOLO + ByteTrack.

---

## 📡 REST API Endpoints

- `GET /`: Serves the primary web dashboard.
- `GET /health`: Runs a lightweight model-inference probe and reports readiness.
- `POST /predict`: Classify a single vehicle specification JSON payload.
- `POST /predict/batch`: Bulk predict up to 50 vehicles in one request.
- `POST /predict/csv`: Upload a CSV file and return classified records or download a tagged CSV (`?format=csv`).
- `GET /sample-csv`: Download a sample CSV with representative vehicle specifications.
- `GET /model/info`: Return metadata on depth, feature importances, classes, and evaluation metrics.
- `GET /api/class-stats`: Per-class training set statistics (mean, min, max per feature).
- `GET /reports/<filename>`: Serve evaluation images (`confusion_matrix.png`, `tree.png`, `feature_importance.png`).
- `POST /analyze-video`: Video tracking and vehicle count analysis (YOLO).
- `GET /robots.txt`: Search engine crawling rules.
- `GET /sitemap.xml`: XML sitemap for SEO discovery.
- `GET /llms.txt`: Plain-text overview of the public pages and model limitations.
- Unknown page routes render a branded 404 page.

### Domain and search metadata

Set `SITE_URL` to the site's public origin in the hosting provider's environment settings (for example, `https://your-domain.example`, with no path). The same value is used for canonical links, social metadata, `robots.txt`, and `sitemap.xml`. The local default is `http://127.0.0.1:5000`; it is not a production domain.

For local PowerShell testing:

```powershell
$env:SITE_URL = "https://your-domain.example"
python app/app.py
```

Point the domain's DNS records at the hosting provider and enable TLS there; application code cannot register a domain or configure a provider account. This is a software application rather than a local storefront, so its structured data uses `SoftwareApplication` and intentionally does not invent a `LocalBusiness` address or business identity. The JavaScript is served as a small static file; there is no Vite/React build or source-map output.

---

## Data, model, and privacy

- `data/vehicles.csv` contains 2,000 generated synthetic examples (200 per class). `src/generate_data.py` uses fixed seed 42 and introduces 1% synthetic label noise. These are not measurements from a real vehicle fleet.
- `src/train.py` uses a stratified 80/20 split (400 held-out rows) and five-fold `GridSearchCV` with macro-F1 scoring for model selection. Published test metrics describe the held-out synthetic rows only; they do not establish real-world performance.
- Single-vehicle specifications are submitted to this app's server for inference. The browser stores up to 20 recent predictions in local storage. CSV files are parsed for the request; video uploads are written to a temporary server file and the app attempts to delete it after analysis.
- Hosting-provider request logs and retention are outside this repository's control. The page also requests fonts from Google Fonts. Do not submit sensitive information.

## 🔒 Security & Reliability

- **Security Headers:** Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **CORS Support:** Full Cross-Origin Resource Sharing enabled for external integrations.
- **Input Validation:** Strict finite-number and non-negative bounds checking prevents malformed requests and code injection.
- **Size Limits:** Enforced 100 MB maximum request payload for video and batch file processing.
