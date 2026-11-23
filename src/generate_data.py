"""Generate a synthetic vehicle-specification dataset.

Expanded class taxonomy covering 10 major vehicle categories:
Bike, Scooter, Auto-Rickshaw, Car, SUV, Pickup, Van, Truck, Bus, Tractor.

Run from anywhere:  python src/generate_data.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_PATH = BASE_DIR / "data" / "vehicles.csv"

SEED = 42
ROWS_PER_CLASS = 200
LABEL_NOISE = 0.01  # fraction of rows given a wrong label (recording errors)

rng = np.random.default_rng(SEED)

# Each category: [(probability, wheels choices, {feature: (low, high)})]
SPECS = {
    "Bike": [
        (1.0, [2], dict(length_m=(1.9, 2.3), width_m=(0.7, 0.9), height_m=(1.0, 1.3),
                        weight_kg=(140, 320), engine_cc=(200, 1200),
                        seating_capacity=(1, 2), max_speed_kmh=(110, 220))),
    ],
    "Scooter": [
        (1.0, [2], dict(length_m=(1.65, 1.95), width_m=(0.62, 0.76), height_m=(1.05, 1.25),
                        weight_kg=(90, 135), engine_cc=(95, 160),
                        seating_capacity=(2, 2), max_speed_kmh=(65, 95))),
    ],
    "Auto-Rickshaw": [
        (1.0, [3], dict(length_m=(2.6, 3.2), width_m=(1.2, 1.5), height_m=(1.65, 1.9),
                        weight_kg=(300, 480), engine_cc=(150, 400),
                        seating_capacity=(3, 4), max_speed_kmh=(45, 70))),
    ],
    "Car": [
        (1.0, [4], dict(length_m=(3.6, 4.8), width_m=(1.6, 1.85), height_m=(1.35, 1.55),
                        weight_kg=(850, 1600), engine_cc=(1000, 2500),
                        seating_capacity=(4, 5), max_speed_kmh=(145, 230))),
    ],
    "SUV": [
        (1.0, [4], dict(length_m=(4.2, 5.2), width_m=(1.75, 2.05), height_m=(1.68, 1.95),
                        weight_kg=(1550, 2600), engine_cc=(1500, 3800),
                        seating_capacity=(5, 7), max_speed_kmh=(155, 215))),
    ],
    "Pickup": [
        (1.0, [4], dict(length_m=(5.1, 5.9), width_m=(1.8, 2.05), height_m=(1.75, 1.95),
                        weight_kg=(1850, 2900), engine_cc=(2000, 3500),
                        seating_capacity=(2, 5), max_speed_kmh=(125, 175))),
    ],
    "Van": [
        (1.0, [4], dict(length_m=(4.7, 6.2), width_m=(1.85, 2.15), height_m=(2.1, 2.75),
                        weight_kg=(2100, 3600), engine_cc=(2000, 3200),
                        seating_capacity=(7, 14), max_speed_kmh=(115, 160))),
    ],
    "Truck": [
        (1.0, [6, 8, 10, 12], dict(length_m=(7.0, 12.5), width_m=(2.3, 2.6), height_m=(3.0, 4.0),
                                   weight_kg=(6500, 22000), engine_cc=(4000, 9500),
                                   seating_capacity=(2, 3), max_speed_kmh=(75, 110))),
    ],
    "Bus": [
        (1.0, [6, 8], dict(length_m=(9.0, 14.0), width_m=(2.4, 2.6), height_m=(3.1, 3.8),
                           weight_kg=(8500, 17000), engine_cc=(4500, 9000),
                           seating_capacity=(28, 65), max_speed_kmh=(80, 115))),
    ],
    "Tractor": [
        (1.0, [4], dict(length_m=(3.1, 4.4), width_m=(1.8, 2.45), height_m=(2.2, 3.0),
                        weight_kg=(2300, 6200), engine_cc=(2100, 4500),
                        seating_capacity=(1, 2), max_speed_kmh=(25, 42))),
    ],
}


def draw(low: float, high: float) -> float:
    """Bell-shaped sample inside [low, high]."""
    value = rng.normal((low + high) / 2, (high - low) / 4)
    return float(np.clip(value, low, high))


def make_row(label: str) -> dict:
    subtypes = SPECS[label]
    idx = rng.choice(len(subtypes), p=[s[0] for s in subtypes])
    _, wheel_choices, ranges = subtypes[idx]
    row = {"wheels": int(rng.choice(wheel_choices))}
    for feature, (low, high) in ranges.items():
        row[feature] = draw(low, high)
    row["length_m"] = round(row["length_m"], 2)
    row["width_m"] = round(row["width_m"], 2)
    row["height_m"] = round(row["height_m"], 2)
    row["weight_kg"] = int(round(row["weight_kg"]))
    row["engine_cc"] = int(round(row["engine_cc"]))
    row["seating_capacity"] = int(round(row["seating_capacity"]))
    row["max_speed_kmh"] = int(round(row["max_speed_kmh"]))
    row["vehicle_type"] = label
    return row


def main() -> None:
    labels = list(SPECS)
    rows = [make_row(label) for label in labels for _ in range(ROWS_PER_CLASS)]
    df = pd.DataFrame(rows)

    # Label noise: a few rows get an incorrect label (recording errors)
    noisy = rng.random(len(df)) < LABEL_NOISE
    for i in df.index[noisy]:
        others = [lab for lab in labels if lab != df.at[i, "vehicle_type"]]
        df.at[i, "vehicle_type"] = str(rng.choice(others))

    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {len(df)} rows across {len(labels)} classes to {OUT_PATH}")
    print(df["vehicle_type"].value_counts())


if __name__ == "__main__":
    main()
