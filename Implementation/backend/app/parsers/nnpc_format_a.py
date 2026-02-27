import re
from typing import Dict, Any, List
from io import BytesIO
import pdfplumber

def parse_nnpc_format_a(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Enhanced NNPC Format A parser:
    - Extracts Operations (existing logic)
    - Extracts Mud properties (Section 4.1)
    - Extracts Equipment/BHA components (Section 5.1.2)
    """

    operations = []
    mud = {}
    equipment = []

    matched_rows_preview = []
    debug_preview = ""

    # -------------------------------------------------------
    # Utility Functions
    # -------------------------------------------------------
    time_pat = re.compile(r"^\d{1,2}:\d{2}$")

    def to_float(x):
        try:
            return float(x)
        except:
            return None

    def guess_op_type(phase, op_text) -> str:
        t = (phase + " " + op_text).upper()
        if "DRL" in t or "CSG" in t:
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

    # -------------------------------------------------------
    # Start PDF parsing
    # -------------------------------------------------------
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:

            debug_preview = (pdf.pages[0].extract_text() or "")[:1500]

            for page in pdf.pages:
                text = page.extract_text() or ""
                tables = page.extract_tables() or []

                # ============================================================
                # 1. MUD EXTRACTION (Section 4.1 Mud)
                # ============================================================
                if "4.1       Mud" in text:
                    for tbl in tables:
                        # The mud table has >= 10 columns
                        if len(tbl) > 1 and len(tbl[1]) >= 8:
                            row = [c.strip() for c in tbl[1]]

                            mud = {
                                "desc": row[0],
                                "density_ppg": to_float(row[1]),
                                "viscosity_sqt": to_float(row[2]),
                                "datetime": row[3],
                                "md_check_ft": to_float(row[4]),
                                "pv_cp": to_float(row[5]),
                                "yp_lbf100ft2": to_float(row[6]),
                                "cl_ppm": to_float(row[7]) if len(row) > 7 else None,
                                "ca_ppm": to_float(row[8]) if len(row) > 8 else None,
                                "pH": to_float(row[9]) if len(row) > 9 else None,
                                "pm_cc": to_float(row[10]) if len(row) > 10 else None,
                                "pf_cc": to_float(row[11]) if len(row) > 11 else None,
                                "mf_cc": to_float(row[12]) if len(row) > 12 else None,
                            }

                # ============================================================
                # 2. EQUIPMENT EXTRACTION (BHA Assembly Components)
                # ============================================================
                if "5.1.2       Assembly Components" in text:
                    for tbl in tables:
                        # Identify BHA component table: first row contains headers
                        header_row = tbl[0]
                        if "Component type" in header_row[0]:
                            for row in tbl[1:]:
                                cells = [c.strip() for c in row]
                                if not cells or len(cells) < 2:
                                    continue

                                equipment.append({
                                    "component_type": cells[0],
                                    "joints": to_float(cells[1]),
                                    "length_ft": to_float(cells[2]) if len(cells) > 2 else None,
                                    "od_in": to_float(cells[3]) if len(cells) > 3 else None,
                                    "id_in": to_float(cells[4]) if len(cells) > 4 else None,
                                    "connection": cells[5] if len(cells) > 5 else None,
                                    "weight_ppf": to_float(cells[6]) if len(cells) > 6 else None,
                                    "grade": cells[7] if len(cells) > 7 else None,
                                    "pin_box": cells[8] if len(cells) > 8 else None,
                                    "serial_no": cells[9] if len(cells) > 9 else None,
                                    "spiral": cells[10] if len(cells) > 10 else None,
                                    "fish_neck_length_ft": to_float(cells[11]) if len(cells) > 11 else None,
                                    "fish_neck_od": to_float(cells[12]) if len(cells) > 12 else None,
                                })

                # ============================================================
                # 3. OPERATIONS (your existing logic unchanged)
                # ============================================================
                for tbl in tables:
                    for row in tbl:
                        if not row:
                            continue

                        cells = [(c or "").strip() for c in row]
                        if len(cells) < 6:
                            continue

                        # skip headers
                        joined = " ".join(cells).upper()
                        if "FROM" in joined and "TO" in joined:
                            continue
                        if not (time_pat.match(cells[0]) and time_pat.match(cells[1])):
                            continue

                        if len(matched_rows_preview) < 10:
                            matched_rows_preview.append(cells)

                        dur_hours = to_float(cells[2])
                        phase = cells[3] if len(cells) > 3 else ""
                        op_text = cells[-1]

                        # depth extraction
                        md_from = md_to = None
                        if len(cells) >= 9:
                            md_from = to_float(cells[7])
                            md_to = to_float(cells[8])
                        if (md_from is None or md_to is None) and len(cells) >= 8:
                            md_from = to_float(cells[6])
                            md_to = to_float(cells[7])

                        if md_from is None or md_to is None:
                            nums = [to_float(c) for c in cells if re.fullmatch(r"\d+(\.\d+)?", c)]
                            nums = [n for n in nums if n is not None]
                            if len(nums) >= 2:
                                md_from, md_to = nums[-2], nums[-1]
                        if md_from is None or md_to is None:
                            continue

                        operations.append({
                            "depth_from": md_from,
                            "depth_to": md_to,
                            "operation_type": guess_op_type(phase, op_text),
                            "description": op_text[:500],
                            "duration_hours": dur_hours,
                            "start_time_str": cells[0],
                            "end_time_str": cells[1],
                            "raw_line": " | ".join(cells),
                        })

    except Exception as e:
        return {
            "operations": [],
            "equipment": [],
            "mud": {},
            "notes": f"Parse failed: {e}",
            "debug_preview": debug_preview,
            "matched_rows_preview": []
        }

    return {
        "operations": operations,
        "equipment": equipment,
        "mud": mud,
        "notes": f"NNPC_FORMAT_A: Parsed ops={len(operations)}, equipment={len(equipment)}",
        "matched_rows_preview": matched_rows_preview,
    }