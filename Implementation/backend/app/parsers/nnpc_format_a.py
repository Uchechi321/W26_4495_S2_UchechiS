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

    def guess_op_type(phase: str, op_text: str) -> str:
        t = (phase + " " + op_text).upper()
        if "DRL" in t:
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
            return float(x)
        except:
            return None

    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            debug_preview = (pdf.pages[0].extract_text() or "")[:1500]

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
            "notes": f"NNPC_FORMAT_A: table extraction failed ({e})",
            "debug_preview": debug_preview,
            "matched_rows_preview": [],
        }

    return {
        "operations": operations,
        "events": [],
        "notes": f"NNPC_FORMAT_A: Operation rows parsed: {len(operations)} (table-based, depth-fixed)",
        "debug_preview": debug_preview,
        "matched_rows_preview": matched_rows_preview,
    }
