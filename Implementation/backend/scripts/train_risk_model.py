"""
Train RandomForestRegressor to predict risk score (0–1) from segment features.

Weak labels: teacher = heuristic risk score (ml_heuristic.compute_risk_score).

Usage (from Implementation/backend):
  python scripts/train_risk_model.py

Requires: scikit-learn, joblib, SQLAlchemy, operations in drilling.db
"""

from __future__ import annotations

import sys
from pathlib import Path

# backend/ is on path
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import sqlite3

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from app.services.ml_features import FEATURE_NAMES, segment_to_feature_row
from app.services.ml_heuristic import compute_risk_score

MIN_SAMPLES = 30
ARTIFACTS_DIR = BACKEND_ROOT / "app" / "services" / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "risk_regressor.joblib"
DB_PATH = BACKEND_ROOT / "drilling.db"


def operations_to_segments() -> list:
    """Read operations with sqlite3 so we do not need full SQLAlchemy mapper setup."""
    if not DB_PATH.is_file():
        return []
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.execute(
            """
            SELECT depth_from, depth_to, operation_type, description, npt_hours
            FROM operations
            """
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    segments = []
    for depth_from, depth_to, operation_type, description, npt_hours in rows:
        segments.append(
            {
                "from": depth_from,
                "to": depth_to,
                "operationType": operation_type,
                "eventType": operation_type,
                "whyItMatters": (description or "") or "",
                "nptHours": npt_hours,
            }
        )
    return segments


def main():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    segments = operations_to_segments()

    n = len(segments)
    if n < MIN_SAMPLES:
        print(
            f"Not enough operations to train (have {n}, need >= {MIN_SAMPLES}). "
            "Add more reports/operations or keep using heuristic fallback."
        )
        return 1

    X = np.vstack([segment_to_feature_row(s) for s in segments])
    y = np.array([compute_risk_score(s) for s in segments], dtype=np.float64)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    print(f"Trained RandomForestRegressor on {n} segments. Hold-out MAE vs teacher score: {mae:.4f}")

    import joblib

    joblib.dump(
        {"model": model, "feature_names": FEATURE_NAMES, "n_train": n},
        MODEL_PATH,
    )
    print(f"Saved model to {MODEL_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
