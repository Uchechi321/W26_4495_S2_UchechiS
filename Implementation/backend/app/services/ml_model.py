"""
Trained risk model (RandomForestRegressor) when artifacts exist; otherwise heuristic fallback.

Training: weak labels = heuristic risk score from historical operations (see scripts/train_risk_model.py).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from .ml_features import FEATURE_NAMES, segment_to_feature_row
from .ml_heuristic import (
    classify_severity_from_score,
    compute_risk_score,
    force_high_from_signals,
    predict_segment_heuristic,
)

_ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
_MODEL_PATH = _ARTIFACTS_DIR / "risk_regressor.joblib"

_regressor: Optional[Any] = None
_model_feature_names: Optional[list] = None
_load_attempted: bool = False


def _load_regressor() -> None:
    global _regressor, _model_feature_names, _load_attempted
    if _regressor is not None:
        return
    if _load_attempted:
        return
    _load_attempted = True
    if not _MODEL_PATH.is_file():
        return
    try:
        import joblib  # lazy: optional dependency until model load
    except ImportError:
        return
    try:
        bundle = joblib.load(_MODEL_PATH)
        _regressor = bundle.get("model")
        _model_feature_names = bundle.get("feature_names")
        if _model_feature_names and list(_model_feature_names) != list(FEATURE_NAMES):
            _regressor = None
            _model_feature_names = None
    except Exception:
        _regressor = None
        _model_feature_names = None


def predict_segment_risk(segment: Dict[str, Any]) -> Dict[str, Any]:
    """
    If a trained regressor is present, predict risk score in [0,1] from features.
    Severity uses the same business rules: force-high keywords/NPT, else thresholds on score.
    If no model or error, fall back to full heuristic.
    """
    _load_regressor()

    if _regressor is None:
        return predict_segment_heuristic(segment)

    try:
        row = segment_to_feature_row(segment)
        X = [row]
        raw = float(_regressor.predict(X)[0])
        score = max(0.0, min(1.0, raw))
        score = round(score, 2)
    except Exception:
        return predict_segment_heuristic(segment)

    severity = "High" if force_high_from_signals(segment) else classify_severity_from_score(score)

    return {
        "riskScore": score,
        "predictedSeverity": severity,
    }


__all__ = [
    "predict_segment_risk",
    "compute_risk_score",
    "classify_severity_from_score",
    "force_high_from_signals",
    "predict_segment_heuristic",
    "segment_to_feature_row",
    "FEATURE_NAMES",
]
