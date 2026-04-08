"""Feature vector for trained risk model (must match training script).

Uses plain Python lists so numpy is not required at import time.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .ml_heuristic import _to_float


def segment_to_feature_row(segment: Dict[str, Any]) -> List[float]:
    """
    Fixed-order numeric features for sklearn. Keep in sync with scripts/train_risk_model.py.
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
    desc_len = min(len(desc), 5000) / 5000.0

    op_drill = 1.0 if ("drilling" in operation or "drill" in operation) else 0.0
    op_ream = 1.0 if ("reaming" in operation or "ream" in operation) else 0.0
    op_trip = 1.0 if ("tripping" in operation or "trip" in operation) else 0.0
    op_other = 1.0 if (op_drill + op_ream + op_trip) == 0 else 0.0

    flag_sk = 1.0 if any(k in desc for k in ("stuck", "stuck pipe", "kick", "well control")) else 0.0
    flag_td = 1.0 if any(
        k in desc for k in ("torque", "drag", "overpull", "hookload", "differential stick")
    ) else 0.0
    flag_loss = 1.0 if ("lost circulation" in desc or ("loss" in desc and "circulation" in desc)) else 0.0
    flag_fluid_loss = 1.0 if "fluid loss" in desc else 0.0

    return [
        npt,
        depth_from,
        depth_to,
        depth_range,
        desc_len,
        op_drill,
        op_ream,
        op_trip,
        op_other,
        flag_sk,
        flag_td,
        flag_loss,
        flag_fluid_loss,
    ]


FEATURE_NAMES: List[str] = [
    "npt_hours",
    "depth_from",
    "depth_to",
    "depth_range",
    "desc_len_norm",
    "op_drill",
    "op_ream",
    "op_trip",
    "op_other",
    "flag_stuck_kick_wc",
    "flag_torque_drag",
    "flag_loss_circ",
    "flag_fluid_loss",
]
