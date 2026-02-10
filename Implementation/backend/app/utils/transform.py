import re
import pandas as pd

from app.utils.column_mapping import COLUMN_MAPPING

# ---------------------------------------------------------
# CATEGORY MAPS
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
# STRONG HEADER CLEANER
# (fixes extra spaces, brackets, weird chars, etc.)
# ---------------------------------------------------------
def clean_header(col: object) -> str:
    s = str(col)

    # Excel sometimes puts non-breaking spaces
    s = s.replace("\u00a0", " ").strip().lower()

    # Remove brackets/parentheses
    s = s.replace("(", "").replace(")", "")
    s = s.replace("[", "").replace("]", "")

    # Convert any run of non-alphanumeric to underscore
    s = re.sub(r"[^a-z0-9]+", "_", s)

    # Remove leading/trailing underscores
    s = s.strip("_")

    return s


# ---------------------------------------------------------
# MAIN TRANSFORMATION PIPELINE
# ---------------------------------------------------------
def transform_dataset(df: pd.DataFrame) -> pd.DataFrame:
    # 1) Clean + normalize raw column names
    df.columns = [clean_header(c) for c in df.columns]

    # 2) Apply COLUMN_MAPPING (keys should match cleaned format)
    df = df.rename(columns={c: COLUMN_MAPPING.get(c, c) for c in df.columns})

    # 3) Depth conversion
    # If depth_m already exists, ensure numeric
    if "depth_m" in df.columns:
        df["depth_m"] = pd.to_numeric(df["depth_m"], errors="coerce")

    # If depth_m missing but depth_ft exists, convert
    if "depth_m" not in df.columns and "depth_ft" in df.columns:
        df["depth_m"] = pd.to_numeric(df["depth_ft"], errors="coerce") * 0.3048

    # Drop depth_ft if present
    if "depth_ft" in df.columns:
        df.drop(columns=["depth_ft"], inplace=True, errors="ignore")

    # 4) Clean dates and timestamps
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    # Combine date + time if both exist
    if "date" in df.columns and "time" in df.columns:
        df["timestamp"] = pd.to_datetime(
            df["date"].astype(str) + " " + df["time"].astype(str),
            errors="coerce"
        )
        df.drop(columns=["time"], inplace=True, errors="ignore")

    # 5) Map operation and event categories
    if "operation_type" in df.columns:
        raw = df["operation_type"].astype(str)
        df["operation_type"] = (
            raw.str.strip().str.lower()
            .map(OPERATION_MAP)
            .fillna(raw)
        )

    if "event_type" in df.columns:
        raw = df["event_type"].astype(str)
        df["event_type"] = (
            raw.str.strip().str.lower()
            .map(EVENT_MAP)
            .fillna(raw)
        )

    # 6) Remove rows missing critical fields
    if "well_id" in df.columns:
        df = df[df["well_id"].notna()]

    # 7) Drop fully empty rows
    df = df.dropna(how="all")

    return df
