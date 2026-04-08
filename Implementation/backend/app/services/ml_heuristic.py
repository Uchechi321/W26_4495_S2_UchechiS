"""Heuristic risk scoring (teacher labels + fallback when no trained model is present)."""

from typing import Any, Dict


def _to_float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def compute_risk_score(segment: Dict[str, Any]) -> float:
    """
    Hand-tuned weighted score from NPT, depth span, operation type, and description keywords.
    Used as weak supervision target for training and as fallback inference.
    """
    npt = _to_float(segment.get("nptHours", segment.get("npt_hours", 0.0)))
    depth_from = _to_float(segment.get("from", segment.get("depth_from", 0.0)))
    depth_to = _to_float(segment.get("to", segment.get("depth_to", 0.0)))
    operation = str(
        segment.get("operationType", segment.get("operation_type", segment.get("eventType", "")))
        or ""
    ).lower()
    desc = str(segment.get("whyItMatters", segment.get("description", "")) or "").lower()

    depth_range = max(0.0, depth_to - depth_from)
    npt_score = min(max(npt, 0.0) / 10.0, 1.0)
    depth_score = min(depth_range / 1000.0, 1.0)

    operation_weight = 0.30
    if "drilling" in operation or "drill" in operation:
        operation_weight = 0.50
    elif "reaming" in operation or "ream" in operation:
        operation_weight = 0.60
    elif "tripping" in operation or "trip" in operation:
        operation_weight = 0.40

    anomaly_bonus = 0.0
    if any(k in desc for k in ("stuck", "stuck pipe", "kick", "well control")):
        anomaly_bonus += 0.20
    if any(k in desc for k in ("torque", "drag", "overpull", "hookload", "differential stick")):
        anomaly_bonus += 0.15
    if "lost circulation" in desc or ("loss" in desc and "circulation" in desc):
        anomaly_bonus += 0.15

    risk_score = (0.50 * npt_score) + (0.30 * depth_score) + (0.20 * operation_weight) + anomaly_bonus
    risk_score = max(0.0, min(risk_score, 1.0))
    return round(risk_score, 2)


def classify_severity_from_score(score: float) -> str:
    if score < 0.30:
        return "Low"
    if score < 0.50:
        return "Medium"
    return "High"


def force_high_from_signals(segment: Dict[str, Any]) -> bool:
    npt = _to_float(segment.get("nptHours", segment.get("npt_hours", 0.0)))
    if npt > 5.0:
        return True

    desc = str(segment.get("whyItMatters", segment.get("description", "")) or "").lower()
    force_high_terms = (
        "stuck pipe",
        "stuck",
        "kick",
        "well control",
        "fluid loss",
        "lost circulation",
    )
    return any(term in desc for term in force_high_terms)


def predict_segment_heuristic(segment: Dict[str, Any]) -> Dict[str, Any]:
    score = compute_risk_score(segment)
    severity = "High" if force_high_from_signals(segment) else classify_severity_from_score(score)
    return {
        "riskScore": score,
        "predictedSeverity": severity,
    }
