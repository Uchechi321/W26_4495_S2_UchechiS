# backend/services/risk_engine.py

import math

def classify_risk(score: float):
    if score >= 71:
        return "HIGH"
    if score >= 41:
        return "MEDIUM"
    return "LOW"

def compute_mud_risk(mud):
    if not mud:
        return 0

    risk = 0

    mw = mud.get("density_ppg", 0)
    pv = mud.get("pv_cp", 0)
    yp = mud.get("yp_lbf100ft2", 0)
    ca = mud.get("ca_ppm", 0)

    if mw < 9:
        risk += 10
    if pv > 35:
        risk += 8
    if yp < 10:
        risk += 12
    if ca and ca > 400:
        risk += 10

    return risk


def compute_stress_risk(operations):
    stress = 0

    for op in operations:
        desc = (op.get("description") or "").lower()

        if "stuck" in desc or "pack off" in desc:
            stress += 35
        if "torque" in desc or "drag" in desc:
            stress += 15
        if "ream" in desc:
            stress += 10
        if "loss" in desc and "circulation" in desc:
            stress += 10
        if "vibration" in desc:
            stress += 10

    return stress


def compute_operating_hours(operations):
    hours = 0
    for op in operations:
        t = (op.get("operation_type") or "").lower()
        if "drill" in t or "ream" in t or "trip" in t:
            if op.get("duration_hours"):
                hours += op["duration_hours"]
    return round(hours, 2)


def equipment_base_intervals():
    return {
        "Drill Bit Primary": 300,
        "Drill String Primary": 2500,
        "Drilling Motor Downhole": 600,
        "Bottom Hole Assembly Downhole": 400,
        "Top Drive Surface": 2800,
        "Mud Pumps Surface": 3000,
    }


def build_equipment_status(operations, equipment, mud):
    operating_hours = compute_operating_hours(operations)
    mud_risk = compute_mud_risk(mud)
    stress_risk = compute_stress_risk(operations)

    base_intervals = equipment_base_intervals()
    result = []

    for name, interval in base_intervals.items():
        # Total raw score
        raw_score = stress_risk + mud_risk + (operating_hours / interval) * 100 * 0.4
        score = min(100, round(raw_score, 1))
        level = classify_risk(score)

        remaining = max(0, round(interval - operating_hours, 1))

        action = "Monitor"
        if level == "HIGH":
            action = "Inspect"

        result.append({
            "name": name,
            "riskScore": score,
            "riskLevel": level,
            "operatingHours": f"{operating_hours} / {interval}",
            "action": action,
            "nextMaintenanceHours": remaining
        })

    return result


def compute_overall_summary(equip_status):
    scores = [e["riskScore"] for e in equip_status]

    high = sum(1 for e in equip_status if e["riskLevel"] == "HIGH")
    medium = sum(1 for e in equip_status if e["riskLevel"] == "MEDIUM")
    low = sum(1 for e in equip_status if e["riskLevel"] == "LOW")

    return {
        "overall_risk": round(sum(scores) / len(scores), 1),
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low
    }


def run_predictive_maintenance(operations, equipment, mud):
    equip_status = build_equipment_status(operations, equipment, mud)
    summary = compute_overall_summary(equip_status)

    return {
        "summary": summary,
        "equipment": equip_status
    }