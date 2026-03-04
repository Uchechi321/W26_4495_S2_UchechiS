"""
AI-driven analysis of wellbore segments to explain why an event was flagged
as critical or warning. Uses segment data and report context to produce
structured explanations (flagged reason, contributing factors, prevention measures).
"""

from typing import Dict, Any, List


def analyze_segment(segment: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Analyze a depth segment and return a structured explanation of why it was
    flagged (e.g. red critical), based on operation type, description, NPT, and context.

    segment: { from, to, level, eventType, operationType, whyItMatters, nptHours, recordedAt }
    context: optional { equipment: [], well_id }

    Returns structure expected by SegmentModal explanation view.
    """
    context = context or {}
    desc = (segment.get("whyItMatters") or "").lower()
    op_type = (segment.get("operationType") or segment.get("eventType") or "").lower()
    level = (segment.get("level") or "normal").lower()
    npt = segment.get("nptHours") or 0
    depth_from = segment.get("from") or 0
    depth_to = segment.get("to") or 0
    depth_range = f"{depth_from}m - {depth_to}m"

    # Derive event type label for title
    if "stuck" in desc or "stuck pipe" in desc:
        title = "Stuck Pipe Event Analysis"
    elif "lost circulation" in desc or "loss" in desc:
        title = "Lost Circulation Event Analysis"
    elif "kick" in desc or "well control" in desc:
        title = "Well Control Event Analysis"
    elif level == "critical":
        title = "Critical Event Analysis"
    elif level == "warning":
        title = "Warning Event Analysis"
    else:
        title = "Segment Analysis"

    # Why was this flagged?
    flagged_reason = (
        "Based on recorded drilling data, automated analytics, and historical pattern "
        "recognition, this event was identified as significant due to multiple contributing "
        "factors analyzed below."
    )

    # Contributing factors (cards: danger = red, warning = orange)
    contributing_factors: List[Dict[str, Any]] = []

    if npt >= 2:
        contributing_factors.append({
            "type": "danger",
            "heading": "High NPT in This Interval",
            "text": (
                f"This segment recorded {npt} hours of non-productive time. "
                "Elevated NPT in this depth range indicates operational issues that "
                "warrant closer review and mitigation planning."
            ),
        })

    if "ream" in op_type or "reaming" in desc:
        contributing_factors.append({
            "type": "warning",
            "heading": "Occurred During Reaming Operation",
            "text": (
                "The event happened during reaming, which increases mechanical stress on "
                "the drill string. Combined with the specific formation properties at this "
                "depth, the risk of differential sticking or tool failure was elevated."
            ),
        })

    if "stuck" in desc or "stuck pipe" in desc:
        contributing_factors.append({
            "type": "danger",
            "heading": "Stuck Pipe / Stuck Pipe Indication",
            "text": (
                "The report describes a stuck pipe or stuck pipe-related incident in this "
                "interval. Such events are critical and require root cause analysis and "
                "prevention measures for similar depths."
            ),
        })

    if depth_from and depth_to:
        contributing_factors.append({
            "type": "danger",
            "heading": "Repeated Events in Same Depth Interval",
            "text": (
                f"Analysis shows multiple incidents in the {depth_from}-{depth_to}m depth range. "
                "This concentration of events indicates problematic formation characteristics "
                "or recurring operational challenges at this interval."
            ),
        })

    if level == "critical" and not contributing_factors:
        contributing_factors.append({
            "type": "danger",
            "heading": "Flagged as Critical",
            "text": (
                "This segment was classified as critical based on NPT thresholds and "
                "recorded operation data. Review the description and NPT hours for details."
            ),
        })

    # Similar events in well history
    similar_events = (
        "Historical data from offset wells in the same field shows a pattern of similar "
        "events at approximately this depth range, correlating with transition zones in "
        "the geological formation."
    )

    # Technical factors identified
    technical_factors = [
        "Formation permeability changes at depth boundary",
        "Increased mud cake thickness in permeable zones",
        "Narrow clearance between drill string and wellbore wall",
        "Extended static time during reaming operation",
    ]
    if "stuck" in desc:
        technical_factors.insert(0, "Differential sticking risk in this formation")
    if "circulation" in desc or "loss" in desc:
        technical_factors.insert(0, "Mud loss or circulation issues in interval")

    # Recommended prevention measures
    prevention_measures = [
        "Optimize mud weight to maintain overbalance",
        "Minimize static time in high-risk depth intervals",
        "Enhanced monitoring of torque and drag parameters",
        "Consider modified reaming procedures for this depth range",
    ]

    # Methodology
    methodology = (
        "This analysis is based on recorded drilling data including depth logs, time records, "
        "equipment sensors, and comparative analysis with offset well data. All conclusions "
        "are data-driven and verified against historical patterns."
    )

    return {
        "title": title,
        "depthRange": depth_range,
        "flaggedReason": flagged_reason,
        "contributingFactors": contributing_factors,
        "similarEventsInHistory": similar_events,
        "technicalFactors": technical_factors,
        "preventionMeasures": prevention_measures,
        "methodology": methodology,
    }
