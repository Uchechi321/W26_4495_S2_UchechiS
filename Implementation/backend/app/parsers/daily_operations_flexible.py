"""
Flexible daily drilling operations table parser for PDFs.

Iterates all pages, extracts tables via pdfplumber, detects header rows by matching
synonyms for: depth from, depth to, operation/activity type, duration, NPT, description.

Column titles may vary widely across operators; we score each header cell against
known synonym lists and assign the best-matching role per column.
"""

from __future__ import annotations

import re
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

# ---------------------------------------------------------------------------
# Synonyms: normalized header substring match (headers are lowercased & stripped)
# ---------------------------------------------------------------------------
ROLE_SYNONYMS: Dict[str, Tuple[str, ...]] = {
    # Time-of-day columns (often "FROM" / "TO" meaning 6:00–8:00, not depth)
    "time_from": (
        "time from",
        "start time",
        "from time",
        "frm time",
        "from",
    ),
    "time_to": (
        "time to",
        "end time",
        "to time",
        "to",
    ),
    "depth_from": (
        "depth from",
        "from depth",
        "md from",
        "start depth",
        "start md",
        "from md",
        "from ft",
        "from (ft)",
        "from (m)",
        "depth start",
        "top depth",
        "start d",
    ),
    "depth_to": (
        "depth to",
        "to depth",
        "end depth",
        "end md",
        "md to",
        "hole depth",
        "measured depth",
        "current depth",
        "current md",
        "depth",
        "md",
        "d depth",
        "bit depth",
        "hole md",
    ),
    "operation_type": (
        "activity",
        "activities",
        "operation",
        "operations",
        "operation type",
        "op type",
        "phase",
        "task",
        "action",
        "mode",
    ),
    "duration": (
        "duration",
        "hours",
        "hour",
        "hrs",
        "hr",
        "elapsed",
        "elapsed time",
        "dur",
        "time spent",
        "total hrs",
    ),
    "npt": (
        "npt",
        "non productive",
        "non-productive",
        "non prod",
        "downtime",
        "down time",
        "delay",
        "lost time",
        "idle",
    ),
    "description": (
        "hourly comments",
        "hourly comment",
        "hourly",
        "comments",
        "comment",
        "remarks",
        "remark",
        "narrative",
        "description",
        "details",
        "detail",
        "notes",
        "note",
        "summary",
        "explanation",
        "observations",
        "observation",
        "what happened",
        "particulars",
        "activities details",
        "operation details",
    ),
}

# If activity matches these, treat row duration as NPT when no explicit NPT column / value.
_NPT_ACTIVITY_HINTS = re.compile(
    r"rig\s+service|rig\s+repairs?|rig\s+repair|downtime|npt|non[\s-]?productive|"
    r"weather|wait(?:ing)?|mechanical\s+down|flat\s+time|surface\s+repair|"
    r"maintenance|repair\b|delay\b",
    re.I,
)

# Primary row: first cell often looks like 6:00, 14:30
_TIME_CELL = re.compile(r"^\d{1,2}:\d{2}(?::\d{2})?$")

# Lines that look like BHA / equipment lists (not operational narratives)
_BHA_LINE_HINT = re.compile(
    r"(?:^|\s)(?:\d+\s*[\d/]+\s*)?(?:HA-|IPGC|HWDP|NMDC|STAB|UBHO|MWD|"
    r"DRILLING\s+JARS|JTS\s+HWDP|DP\s+XO|MUD\s+MOTOR|COLLAR)(?:\s|$)",
    re.I,
)


def _norm_header(s: str) -> str:
    if not s:
        return ""
    t = str(s).replace("\u00a0", " ").strip().lower()
    t = re.sub(r"[\[\](){}]", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def _norm_cell(s: str) -> str:
    return (s or "").replace("\u00a0", " ").strip()


def _to_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("-", "—", "n/a", "na"):
        return None
    s = re.sub(r"[,']", "", s)
    s = re.sub(r"[^\d.\-]", "", s)
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_depth_from_text(text: str) -> Optional[float]:
    """Extract a depth 'from' value from comments, e.g. 'from 6022 ft', '6022' to 6148'."""
    if not text:
        return None
    t = text
    patterns = (
        r"from\s+([\d,]+(?:\.\d+)?)\s*(?:ft|feet|m|meters?|')",
        r"from\s+([\d,]+(?:\.\d+)?)\b",
        r"(?:drill(?:ing)?|slid(?:ing)?)\s+[^.]{0,80}?\s+from\s+([\d,]+(?:\.\d+)?)\s*(?:ft|feet|m|')?",
    )
    for pat in patterns:
        m = re.search(pat, t, re.I)
        if m:
            v = _to_float(m.group(1))
            if v is not None and 0 <= v <= 100000:
                return v
    return None


def _parse_depth_number(val: Any) -> Optional[float]:
    """Parse depth like 6,148' or 6148 ft."""
    return _to_float(val)


def _best_role_for_header(cell: str) -> Tuple[Optional[str], int]:
    """Return (role, score). Higher is better."""
    h = _norm_header(cell)
    if not h:
        return None, 0
    best_role = None
    best_score = 0
    for role, synonyms in ROLE_SYNONYMS.items():
        for syn in synonyms:
            if syn == h:
                score = 100 + len(syn)
            elif syn in h:
                score = 80 + len(syn)
            elif h in syn and len(h) >= 2:
                score = 40 + len(h)
            else:
                continue
            if score > best_score:
                best_score = score
                best_role = role
    return best_role, best_score


def _assign_columns(header_row: List[str]) -> Dict[str, int]:
    """
    Map logical role -> column index. Each column gets its best-matching role; then we
    assign roles globally in descending score order so each role maps to at most one column.
    """
    per_col: List[Tuple[int, int, str]] = []  # (score, col_idx, role)
    for j, cell in enumerate(header_row):
        role, sc = _best_role_for_header(cell)
        if role and sc > 0:
            per_col.append((sc, j, role))

    # Highest score first; tie-break by column index for stability
    per_col.sort(key=lambda x: (-x[0], x[1]))

    used_cols: set = set()
    role_to_col: Dict[str, int] = {}

    for sc, j, role in per_col:
        if j in used_cols:
            continue
        if role in role_to_col:
            continue
        role_to_col[role] = j
        used_cols.add(j)

    hdrs = [_norm_header(c) for c in header_row]

    # Bare "from" / "to" column titles (common in daily reports) as time columns
    if "time_from" not in role_to_col:
        for j, h in enumerate(hdrs):
            if h in ("from", "frm") and j not in used_cols:
                role_to_col["time_from"] = j
                used_cols.add(j)
                break
    if "time_to" not in role_to_col:
        for j, h in enumerate(hdrs):
            if h == "to" and j not in used_cols:
                role_to_col["time_to"] = j
                used_cols.add(j)
                break

    return role_to_col


def _header_quality_score(role_to_col: Dict[str, int]) -> int:
    """How confident we are this is an operations table."""
    s = 0
    if "duration" in role_to_col:
        s += 3
    if "operation_type" in role_to_col:
        s += 3
    if "description" in role_to_col:
        s += 2
    if "depth_to" in role_to_col or "depth_from" in role_to_col:
        s += 2
    if "time_from" in role_to_col and "time_to" in role_to_col:
        s += 2
    if "npt" in role_to_col:
        s += 1
    return s


def _is_total_row(cells: List[str]) -> bool:
    joined = " ".join(_norm_cell(c) for c in cells).lower()
    if "total" in joined and ("hr" in joined or "hour" in joined or re.search(r"\d", joined)):
        return True
    if "job total" in joined:
        return True
    return False


def _infer_npt_hours(
    npt_raw: str,
    npt_val: Optional[float],
    duration: Optional[float],
    op_type: str,
    desc: str,
) -> Optional[float]:
    # Explicit NPT cell present (including 0)
    if npt_raw and npt_raw.strip() not in ("", "-", "—", "n/a", "na"):
        if npt_val is not None:
            return npt_val
    text = f"{op_type} {desc}"
    if _NPT_ACTIVITY_HINTS.search(text):
        return duration
    return None


def _ensure_description_column(header_row: List[str], role_to_col: Dict[str, int]) -> Dict[str, int]:
    """
    pdfplumber often splits headers like 'HOURLY' | 'COMMENTS' or omits a match; map the
    narrative column explicitly. Last column is often comments in FROM/TO/HRS/ACT/DEPTH/COMMENT layouts.
    """
    out = dict(role_to_col)
    if "description" in out:
        return out

    for j in range(len(header_row) - 1):
        joined = _norm_header(f"{header_row[j]} {header_row[j + 1]}")
        if ("hourly" in joined and "comment" in joined) or "hourly comments" in joined:
            out["description"] = j + 1
            return out

    for j, cell in enumerate(header_row):
        hn = _norm_header(cell)
        if any(
            k in hn
            for k in (
                "comment",
                "remark",
                "narrative",
                "observ",
                "particular",
                "descrip",
                "summary",
                "explanation",
                "hourly",
            )
        ):
            out["description"] = j
            return out

    # Typical wide daily log: last column is free text (after time / hrs / activity / depth)
    if "duration" in out and len(header_row) >= 6:
        last_h = _norm_header(header_row[-1])
        if not any(x in last_h for x in ("depth", "md", "ft", "meter")):
            out["description"] = len(header_row) - 1
    return out


def _is_short_numeric_or_time(s: str) -> bool:
    t = _norm_cell(s)
    if not t:
        return True
    if _TIME_CELL.match(t.strip()):
        return True
    if _to_float(t) is not None and len(t) < 12:
        return True
    return False


def _fallback_description_text(data_row: List[str], col: Dict[str, int]) -> str:
    """Use mapped description column, else longest unmapped text cell, else last column if narrative-like."""
    desc_idx = col.get("description")
    if desc_idx is not None and 0 <= desc_idx < len(data_row):
        t = _norm_cell(data_row[desc_idx])
        if len(t) > 3:
            return t

    mapped = set(col.values())
    best = ""
    for j, c in enumerate(data_row):
        if j in mapped:
            continue
        t = _norm_cell(c)
        if len(t) > len(best) and len(t) > 8 and not _is_short_numeric_or_time(t):
            best = t
    if len(best) > 8:
        return best

    if data_row:
        last = _norm_cell(data_row[-1])
        if len(last) > 15 and not _is_short_numeric_or_time(last):
            return last
    return ""


def _cell_at(data_row: List[str], col: Dict[str, int], role: str) -> str:
    idx = col.get(role)
    if idx is None or idx >= len(data_row):
        return ""
    return _norm_cell(data_row[idx])


def _is_primary_operations_row(data_row: List[str], col: Dict[str, int]) -> bool:
    """A main hourly log row usually has a clock time and/or duration + activity or depth."""
    tf = _cell_at(data_row, col, "time_from")
    if tf and _TIME_CELL.match(tf.strip()):
        return True
    dur = _to_float(_cell_at(data_row, col, "duration"))
    op = _cell_at(data_row, col, "operation_type")
    dto = _parse_depth_number(_cell_at(data_row, col, "depth_to"))
    if dur is not None and (bool(op.strip()) or dto is not None):
        return True
    # First column time even if header mapping missed 'from'
    if data_row and _TIME_CELL.match(_norm_cell(data_row[0]).strip()):
        return True
    return False


def _is_continuation_description_row(data_row: List[str], col: Dict[str, int]) -> bool:
    if _is_primary_operations_row(data_row, col):
        return False
    txt = _fallback_description_text(data_row, col)
    return len(txt) > 12


def _is_likely_bha_or_equipment_table(cleaned: List[List[str]], hidx: int, col: Dict[str, int]) -> bool:
    """Skip assembly/BHA component lists mistaken for operations."""
    sample = [r for r in cleaned[hidx + 1 : hidx + 15] if r and any(r)]
    if len(sample) < 2:
        return False
    time_hits = 0
    bha_hits = 0
    for data_row in sample:
        tf = _cell_at(data_row, col, "time_from")
        row_has_time = bool(
            (tf and _TIME_CELL.match(tf.strip()))
            or (data_row and _TIME_CELL.match(_norm_cell(data_row[0]).strip()))
        )
        if row_has_time:
            time_hits += 1
        op = _cell_at(data_row, col, "operation_type")
        desc = _fallback_description_text(data_row, col)
        if _BHA_LINE_HINT.search(f"{op} {desc}"):
            bha_hits += 1
    if time_hits == 0 and bha_hits >= 2:
        return True
    if bha_hits >= 5 and time_hits <= 1:
        return True
    return False


def _build_one_operation(
    data_row: List[str],
    col: Dict[str, int],
) -> Optional[dict]:
    t_from = _cell_at(data_row, col, "time_from")
    t_to = _cell_at(data_row, col, "time_to")
    dur = _to_float(_cell_at(data_row, col, "duration"))
    op_type = _cell_at(data_row, col, "operation_type")
    depth_to_s = _cell_at(data_row, col, "depth_to")
    depth_from_s = _cell_at(data_row, col, "depth_from")
    npt_s = _cell_at(data_row, col, "npt")
    desc = _fallback_description_text(data_row, col)

    if _norm_header(op_type) in ("activity", "operation", "hours", "hrs"):
        if _norm_header(desc) in ("hourly comments", "comments", "description"):
            return None

    depth_to = _parse_depth_number(depth_to_s)
    depth_from = _parse_depth_number(depth_from_s)
    if depth_from is None and desc:
        depth_from = _parse_depth_from_text(desc)

    npt_val = _to_float(npt_s)
    npt_hours = _infer_npt_hours(npt_s, npt_val, dur, op_type, desc)

    if not op_type and not desc:
        if dur is None and depth_to is None:
            return None
    if dur is None and depth_to is None and not desc:
        return None

    # Drop pure equipment lines with no duration/depth/time
    if (not op_type or op_type == "Other") and dur is None and depth_to is None and not t_from:
        combined = f"{op_type} {desc}"
        if _BHA_LINE_HINT.search(combined) and len(desc) < 120:
            return None

    return {
        "depth_from": depth_from,
        "depth_to": depth_to,
        "operation_type": (op_type or "Other")[:200],
        "description": (desc or "")[:2000],
        "duration_hours": dur,
        "npt_hours": npt_hours,
        "start_time_str": t_from or None,
        "end_time_str": t_to or None,
        "raw_line": " | ".join(data_row[:14]),
    }


def parse_daily_operations_flexible(pdf_bytes: bytes) -> Dict[str, Any]:
    operations: List[dict] = []
    debug_preview = ""
    matched_tables = 0

    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            debug_preview = (pdf.pages[0].extract_text() or "")[:1200] if pdf.pages else ""

            for page in pdf.pages:
                tables = page.extract_tables() or []
                for tbl in tables:
                    cleaned = [[_norm_cell(c) for c in (row or [])] for row in tbl]
                    if not cleaned:
                        continue

                    best_roles: Optional[Dict[str, int]] = None
                    best_hidx = -1
                    best_q = 0

                    for hidx in range(min(6, len(cleaned))):
                        row = cleaned[hidx]
                        if not any(row):
                            continue
                        roles = _assign_columns(row)
                        q = _header_quality_score(roles)
                        if q > best_q:
                            best_q = q
                            best_roles = roles
                            best_hidx = hidx

                    if not best_roles or best_hidx < 0 or best_q < 4:
                        continue

                    col = _ensure_description_column(cleaned[best_hidx], best_roles)

                    if _is_likely_bha_or_equipment_table(cleaned, best_hidx, col):
                        continue

                    matched_tables += 1

                    pending: Optional[dict] = None

                    for data_row in cleaned[best_hidx + 1 :]:
                        if not data_row or not any(data_row):
                            continue
                        if _is_total_row(data_row):
                            continue

                        if _is_primary_operations_row(data_row, col):
                            if pending:
                                operations.append(pending)
                            built = _build_one_operation(data_row, col)
                            pending = built if built else None
                            continue

                        if _is_continuation_description_row(data_row, col):
                            extra = _fallback_description_text(data_row, col)
                            if extra:
                                if pending:
                                    base = (pending.get("description") or "").strip()
                                    pending["description"] = f"{base} {extra}".strip() if base else extra
                                elif operations:
                                    base = (operations[-1].get("description") or "").strip()
                                    operations[-1]["description"] = f"{base} {extra}".strip() if base else extra
                            continue

                        # Wrapped comment lines (short continuation, still narrative)
                        extra = _fallback_description_text(data_row, col)
                        if len(extra) > 12:
                            if pending:
                                base = (pending.get("description") or "").strip()
                                pending["description"] = f"{base} {extra}".strip() if base else extra
                            elif operations:
                                base = (operations[-1].get("description") or "").strip()
                                operations[-1]["description"] = f"{base} {extra}".strip() if base else extra

                    if pending:
                        operations.append(pending)

    except Exception as e:
        return {
            "operations": [],
            "events": [],
            "equipment": [],
            "mud": {},
            "notes": f"DAILY_OPERATIONS_FLEXIBLE: failed ({e})",
            "debug_preview": debug_preview,
            "matched_rows_preview": [],
        }

    notes = (
        f"DAILY_OPERATIONS_FLEXIBLE: parsed {len(operations)} operation row(s) "
        f"from {matched_tables} table(s) with flexible headers."
    )
    return {
        "operations": operations,
        "events": [],
        "equipment": [],
        "mud": {},
        "notes": notes,
        "debug_preview": debug_preview,
        "matched_rows_preview": operations[:10],
    }
