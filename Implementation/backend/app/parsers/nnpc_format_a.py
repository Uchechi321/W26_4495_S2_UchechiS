import re
from typing import Dict, Any, List
from io import BytesIO
import pdfplumber


def parse_nnpc_format_a(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    NNPC Format A parser (Table-based).
    Extracts the "Operation Summary" table using pdfplumber.extract_tables().

    Key improvement:
    - Depth (MD_from, MD_to) is read from the correct table columns instead of
      guessing from "last two numbers", which can be wrong because rows contain
      other numbers (pressures, tool sizes, serial numbers, etc.).
    """

    operations: List[dict] = []
    matched_rows_preview: List[list] = []
    debug_preview = ""
    equipment: List[dict] = []
    mud: Dict[str, Any] = {}

    def guess_op_type(phase: str, op_text: str) -> str:
        t = (phase + " " + op_text).upper()
        if "DRL" in t:
            return "Drilling"
        if "CSG" in t:
            return "Drilling"
        if "REAM" in t:
            return "Reaming"
        if "CIRC" in t:
            return "Circulating"
        if "RIH" in t or "POOH" in t or "TRIP" in t:
            return "Tripping"
        if "TEST" in t:
            return "Testing"
        if "WAIT" in t or "NPT" in t or "DOWN" in t:
            return "Downtime"
        return "Other"

    # Helper: does a row look like an operation row?
    time_pat = re.compile(r"^\d{1,2}:\d{2}$")

    def to_float(x: str):
        try:
            return float(str(x).replace(",", "").strip())
        except (TypeError, ValueError):
            return None

    def _find_table_with_headers(all_tables: List[List[List[str]]], header_keywords: List[str]) -> tuple:
        """
        Find the *best* matching (table, header_row_index) for the given header keywords.
        """
        best_tbl = None
        best_idx = -1
        best_score = 0

        for tbl in all_tables:
            for ri, row in enumerate(tbl):
                if not row:
                    continue
                joined = " ".join((c or "").strip().lower() for c in row)
                score = sum(1 for kw in header_keywords if kw.lower() in joined)
                if score > best_score:
                    best_score = score
                    best_tbl = tbl
                    best_idx = ri

        if best_score >= 1:
            return (best_tbl, best_idx)
        return (None, -1)

    def _find_table_with_headers_prefer_with_data(
        all_tables: List[List[List[str]]], header_keywords: List[str], min_data_rows: int = 1
    ) -> tuple:
        """
        Like _find_table_with_headers but prefers a table that has at least min_data_rows
        data rows below the header. Use this when multiple sections (e.g. 5.12 and 5.22)
        have the same header name but only one has data (e.g. Assembly Components).
        """
        candidates: List[tuple] = []  # (score, num_data_rows, tbl, hidx)

        for tbl in all_tables:
            for ri, row in enumerate(tbl):
                if not row:
                    continue
                joined = " ".join((c or "").strip().lower() for c in row)
                score = sum(1 for kw in header_keywords if kw.lower() in joined)
                if score < 1:
                    continue
                num_data_rows = max(0, len(tbl) - ri - 1)
                # Count non-empty rows as data rows
                data_rows = sum(1 for r in tbl[ri + 1 : ri + 1 + num_data_rows] if r and any((c or "").strip() for c in r))
                candidates.append((score, data_rows, tbl, ri))

        if not candidates:
            return (None, -1)
        # Prefer: has at least min_data_rows data rows, then by (data_rows desc, score desc)
        candidates.sort(key=lambda c: (c[1] >= min_data_rows, c[1], c[0]), reverse=True)
        _, _, best_tbl, best_idx = candidates[0]
        return (best_tbl, best_idx)

    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            debug_preview = (pdf.pages[0].extract_text() or "")[:1500]
            all_tables: List[List[List[str]]] = []
            tables_by_page: List[List[List[List[str]]]] = []
            page_texts: List[str] = []
            for page in pdf.pages:
                page_text = (page.extract_text() or "").lower()
                page_texts.append(page_text)
                page_tables: List[List[List[str]]] = []
                for tbl in page.extract_tables() or []:
                    cleaned = [[(c or "").strip() for c in r] for r in tbl]
                    all_tables.append(cleaned)
                    page_tables.append(cleaned)
                tables_by_page.append(page_tables)

            # Equipment: only consider tables on pages that contain section 5.22 / 5.2.2 (not 5.12).
            equipment_tables = []
            for pi, text in enumerate(page_texts):
                if "5.22" in text or "5.2.2" in text:
                    equipment_tables.extend(tables_by_page[pi])
            if not equipment_tables:
                equipment_tables = all_tables

            # ---------- Equipment (Assembly Components): 5.2.2 only (not 5.12 empty) ----------
            eq_tbl, eq_hidx = None, -1
            for eq_keywords in (
                ["component", "length", "od"],
                ["component type", "length", "od"],
                ["assembly", "joints", "length"],
                ["component", "joints"],
                ["length", "od", "connection"],
            ):
                eq_tbl, eq_hidx = _find_table_with_headers_prefer_with_data(equipment_tables, eq_keywords, min_data_rows=1)
                if eq_tbl is not None and eq_hidx >= 0 and len(eq_tbl) > eq_hidx + 1:
                    break
                eq_tbl, eq_hidx = None, -1

            if eq_tbl is not None and eq_hidx >= 0 and len(eq_tbl) > eq_hidx + 1:
                header = [ (c or "").strip().lower() for c in eq_tbl[eq_hidx] ]
                for row in eq_tbl[eq_hidx + 1:]:
                    cells = [(c or "").strip() for c in row]
                    if not any(cells):
                        continue
                    def col(name_substr: str):
                        for i, h in enumerate(header):
                            if name_substr in h and i < len(cells):
                                return cells[i]
                        return ""
                    def col_float(name_substr: str):
                        return to_float(col(name_substr))
                    component = col("component") or col("type")
                    if not component:
                        continue
                    equipment.append({
                        "component_type": component[:200],
                        "joints": col_float("joint") or col_float("no."),
                        "length_ft": col_float("length"),
                        "od_in": col_float("od"),
                        "id_in": col_float("id"),
                        "connection": (col("connection") or col("name"))[:100],
                        "weight_ppf": col_float("weight"),
                        "grade": (col("grade") or "")[:50],
                        "pin_box": (col("pin") or col("box"))[:50],
                        "serial_no": (col("serial") or "")[:80],
                        "spiral": (col("spiral") or "")[:50],
                        "fish_neck_length_ft": col_float("fish"),
                        "fish_neck_od": col_float("fish"),
                    })

            # Mud: only consider tables on pages that contain section 4.1 (e.g. "4.1 Mud").
            mud_tables = []
            for pi, text in enumerate(page_texts):
                if "4.1" in text and "mud" in text:
                    mud_tables.extend(tables_by_page[pi])
            if not mud_tables:
                mud_tables = all_tables

            # ---------- Mud (4.1 Mud) ----------
            mud_tbl, mud_hidx = None, -1
            for mud_keywords in (
                ["mud", "density"],
                ["density", "ppg"],
                ["mud desc", "density"],
                ["mud desc", "viscosity"],
                ["4.1", "mud"],
                ["daily mud", "density"],
                ["density", "viscosity", "pv"],
            ):
                mud_tbl, mud_hidx = _find_table_with_headers_prefer_with_data(mud_tables, mud_keywords, min_data_rows=1)
                if mud_tbl is not None and mud_hidx >= 0 and len(mud_tbl) > mud_hidx + 1:
                    break
                mud_tbl, mud_hidx = None, -1
            if mud_tbl is not None and mud_hidx >= 0 and len(mud_tbl) > mud_hidx + 1:
                header = [ (c or "").strip().lower() for c in mud_tbl[mud_hidx] ]
                row = mud_tbl[mud_hidx + 1]
                cells = [(c or "").strip() for c in row]

                def mcol(name_substr: str):
                    for i, h in enumerate(header):
                        if name_substr in h and i < len(cells):
                            return cells[i]
                    return ""

                mud = {
                    "mud_desc": cells[0] if cells else "",
                    "density_ppg": to_float(mcol("density") or mcol("ppg")),
                    "viscosity_sqt": to_float(mcol("viscosity") or mcol("s/qt")),
                    "pv_cp": to_float(mcol("pv") or mcol("plastic")),
                    "yp_lbf100ft2": to_float(mcol("yp") or mcol("yield")),
                    "cl_ppm": to_float(mcol("cl") or mcol("chloride")),
                    "ca_ppm": to_float(mcol("ca") or mcol("calcium")),
                    "pH": to_float(mcol("ph")),
                    "pm_cc": to_float(mcol("pm")),
                    "pf_cc": to_float(mcol("pf")),
                    "mf_cc": to_float(mcol("mf")),
                }

            for page in pdf.pages:
                tables = page.extract_tables() or []

                for tbl in tables:
                    for row in tbl:
                        if not row:
                            continue

                        # Clean cells
                        cells = [(c or "").strip() for c in row]

                        # Skip very short rows
                        if len(cells) < 6:
                            continue

                        # Skip header rows
                        joined = " ".join(cells).upper()
                        if "FROM" in joined and "TO" in joined and "DUR" in joined:
                            continue
                        if "OPERATION" in joined and "SUMMARY" in joined:
                            continue

                        # Must start with From time and To time
                        if not (time_pat.match(cells[0]) and time_pat.match(cells[1])):
                            continue

                        # Save preview of matched rows (first 10) so you can inspect columns
                        if len(matched_rows_preview) < 10:
                            matched_rows_preview.append(cells)

                        # Duration is usually column 2
                        dur_hours = to_float(cells[2]) if len(cells) > 2 else None

                        phase = cells[3] if len(cells) > 3 else ""
                        op_text = cells[-1] if len(cells) > 0 else ""

                        # ---------------------------
                        # ✅ Correct Depth Extraction
                        # Expected columns often look like:
                        # [From, To, Dur, Phase, Code, Sub, Class, MD_from, MD_to, Operation]
                        #
                        # But sometimes "Sub" column is missing, shifting indices:
                        # [From, To, Dur, Phase, Code, Class, MD_from, MD_to, Operation]
                        # ---------------------------

                        md_from = None
                        md_to = None

                        # Attempt 1 (most common): MD at indices 7 and 8
                        if len(cells) >= 9:
                            md_from = to_float(cells[7])
                            md_to = to_float(cells[8])

                        # Attempt 2 (if Sub missing): MD at indices 6 and 7
                        if (md_from is None or md_to is None) and len(cells) >= 8:
                            md_from = to_float(cells[6])
                            md_to = to_float(cells[7])

                        # If still not found, as a last resort, fallback to numeric scan
                        # (but only if it looks reasonable)
                        if md_from is None or md_to is None:
                            nums = [to_float(c) for c in cells if re.fullmatch(r"\d+(\.\d+)?", c)]
                            nums = [n for n in nums if n is not None]
                            if len(nums) >= 2:
                                candidate_from = nums[-2]
                                candidate_to = nums[-1]
                                # only accept if they are within plausible depth range
                                if 0 <= candidate_from <= 50000 and 0 <= candidate_to <= 50000:
                                    md_from = candidate_from
                                    md_to = candidate_to

                        # If we still can't get depth, skip this row (better than wrong depth)
                        if md_from is None or md_to is None:
                            continue

                        operations.append({
                            "depth_from": md_from,
                            "depth_to": md_to,
                            "operation_type": guess_op_type(phase, op_text),
                            "description": op_text[:500],
                            "duration_hours": dur_hours,
                            "npt_hours": None,
                            "start_time_str": cells[0],
                            "end_time_str": cells[1],
                            "raw_line": " | ".join(cells),
                        })

    except Exception as e:
        return {
            "operations": [],
            "events": [],
            "equipment": [],
            "mud": {},
            "notes": f"NNPC_FORMAT_A: table extraction failed ({e})",
            "debug_preview": debug_preview,
            "matched_rows_preview": [],
        }

    return {
        "operations": operations,
        "events": [],
        "equipment": equipment,
        "mud": mud,
        "notes": f"NNPC_FORMAT_A: Operation rows parsed: {len(operations)} (table-based, depth-fixed)",
        "debug_preview": debug_preview,
        "matched_rows_preview": matched_rows_preview,
    }
