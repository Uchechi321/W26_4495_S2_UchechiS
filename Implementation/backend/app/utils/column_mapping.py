import re
import pandas as pd

# ---------------------------------------------------------
# 1) COLUMN NORMALIZATION + MAPPING
# ---------------------------------------------------------
# IMPORTANT:
# - We first "clean" headers into a consistent format (lowercase, underscores, no brackets)
# - Then we map cleaned headers to our internal names
# This fixes issues like: "Depth (ft)" vs "depth(ft)" vs "Depth  (ft)"
def _clean_header(col: object) -> str:
    s = str(col)

    # Replace non-breaking spaces and weird whitespace
    s = s.replace("\u00a0", " ").strip().lower()

    # Remove brackets/parentheses and common punctuation
    s = s.replace("(", "").replace(")", "")
    s = s.replace("[", "").replace("]", "")
    s = s.replace("{", "").replace("}", "")
    s = s.replace("%", "pct")

    # Convert any run of non-alphanumeric characters to underscores
    s = re.sub(r"[^a-z0-9]+", "_", s)

    # Remove leading/trailing underscores
    s = s.strip("_")

    return s


# Maps messy Excel headers → clean internal names
# NOTE: Keys here should be in "cleaned" format (underscored, no parentheses).
COLUMN_MAPPING = {
    # Well identifiers
    "well_id": "well_id",
    "wellid": "well_id",
    "well_id_": "well_id",  # just in case
    "well": "well_id",      # optional (remove if too broad)

    "name": "well_name",
    "well_name": "well_name",

    # Location
    "location": "location",
    "well_location": "location",

    # Dates
    "date": "date",
    "operation_date": "date",

    # Depth (feet/meters)
    "depth": "depth_ft",                 # assume feet unless specified
    "measured_depth": "depth_ft",
    "depth_ft": "depth_ft",
    "depthft": "depth_ft",
    "depth_ft_": "depth_ft",
    "depth_ft_maybe": "depth_ft",

    # Common variants like "Depth (ft)" => cleaned becomes "depth_ft"
    "depth_ft": "depth_ft",

    # If file already provides meters
    "depth_m": "depth_m",
    "depthm": "depth_m",
    "measured_depth_m": "depth_m",

    # Operation type
    "operation_type": "operation_type",
    "operation": "operation_type",
    "op_type": "operation_type",
    "operationtype": "operation_type",

    # Timestamp / time
    "timestamp": "timestamp",
    "event_time": "timestamp",
    "time": "time",  # keep as time first; we'll combine with date if both exist

    # Event type
    "event_type": "event_type",
    "event": "event_type",
    "event_name": "event_type",
    "type": "event_type",
    "eventcategory": "event_type",
    "event_category": "event_type",
    "eventtype": "event_type",

    # description variants
    "description": "description",
    "desc": "description",
    "event_desc": "description",
    "event_description": "description",
    "details": "description",
    "comment": "description",
    "comments": "description",
    "notes": "description",
    "note": "description",
    "summary": "description",
}

# ---------------------------------------------------------
# 2) CATEGORY MAPS
# ---------------------------------------------------------
OPERATION_MAP = {
    "drl": "drilling",
    "drilling": "drilling",
    "trip": "tripping",
    "trp": "tripping",
    "csg": "casing",
    "casing": "casing",
}

EVENT_MAP = {
    "connection": "connection",
    "bit trip": "bit_trip",
    "bit_trip": "bit_trip",
    "survey": "survey",
    "incident": "incident",
}

# ---------------------------------------------------------
# 3) NORMALIZE COLUMN NAMES
# ---------------------------------------------------------
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    # 1) Clean headers to a consistent format
    cleaned = {_col: _clean_header(_col) for _col in df.columns}
    df = df.rename(columns=cleaned)

    # 2) Map cleaned headers to internal names
    df = df.rename(columns={c: COLUMN_MAPPING.get(c, c) for c in df.columns})

    return df

# ---------------------------------------------------------
# 4) FULL TRANSFORMATION PIPELINE
# ---------------------------------------------------------
def transform_dataset(df: pd.DataFrame) -> pd.DataFrame:
    # Normalize headers + map to internal names
    df = normalize_columns(df)

    # -----------------------------
    # Depth handling
    # -----------------------------
    # If meters already exists, ensure numeric
    if "depth_m" in df.columns:
        df["depth_m"] = pd.to_numeric(df["depth_m"], errors="coerce")

    # Convert depth_ft → depth_m if needed
    if "depth_m" not in df.columns and "depth_ft" in df.columns:
        df["depth_m"] = pd.to_numeric(df["depth_ft"], errors="coerce") * 0.3048

    # Optional: drop depth_ft after conversion
    if "depth_ft" in df.columns:
        df.drop(columns=["depth_ft"], inplace=True, errors="ignore")

    # -----------------------------
    # Dates / timestamps
    # -----------------------------
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # If timestamp exists, parse it
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    # If date + time exist (time kept as "time"), combine into timestamp
    if "date" in df.columns and "time" in df.columns:
        df["timestamp"] = pd.to_datetime(
            df["date"].astype(str) + " " + df["time"].astype(str),
            errors="coerce",
        )
        df.drop(columns=["time"], inplace=True, errors="ignore")

    # -----------------------------
    # Category mapping
    # -----------------------------
    if "operation_type" in df.columns:
        raw_op = df["operation_type"].astype(str)
        df["operation_type"] = (
            raw_op.str.strip().str.lower()
            .map(OPERATION_MAP)
            .fillna(raw_op)  # keep original if not in map
        )

    if "event_type" in df.columns:
        raw_ev = df["event_type"].astype(str)
        df["event_type"] = (
            raw_ev.str.strip().str.lower()
            .map(EVENT_MAP)
            .fillna(raw_ev)
        )

    # -----------------------------
    # Remove rows missing critical fields
    # -----------------------------
    if "well_id" in df.columns:
        df = df[df["well_id"].notna()]

    # Drop fully empty rows
    df = df.dropna(how="all")

    return df


# ---------------------------------------------------------
# 5) OPTIONAL: REQUIRED COLUMN CHECK (use in your route)
# ---------------------------------------------------------
REQUIRED_COLUMNS = {"well_id", "depth_m", "operation_type"}

def validate_required_columns(df: pd.DataFrame, sheet_name: str = "operations") -> None:
    missing = sorted(REQUIRED_COLUMNS - set(df.columns))
    if missing:
        raise ValueError(
            f"Sheet '{sheet_name}' is missing required columns: {', '.join(missing)}"
        )
