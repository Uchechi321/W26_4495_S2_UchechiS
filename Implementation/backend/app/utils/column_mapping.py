# Default mapping for messy Excel column names → clean database column names
COLUMN_MAPPING = {
    "well id": "well_id",
    "wellid": "well_id",
    "well_id": "well_id",

    "name": "name",
    "well name": "name",

    "location": "location",
    "well location": "location",

    "date": "date",
    "operation date": "date",

    "depth": "depth",
    "measured depth": "depth",

    "operation type": "operation_type",
    "operation_type": "operation_type",

    "timestamp": "timestamp",
    "event time": "timestamp",

    "event type": "event_type",
    "event_type": "event_type",

    "description": "description",
    "event description": "description",
}


def normalize_columns(columns, mapping=COLUMN_MAPPING):
    """
    Clean and normalize column names:
    - strip spaces
    - lowercase
    - apply mapping if available
    - leave untouched if no mapping exists
    """
    normalized = []
    for col in columns:
        key = col.strip().lower()
        normalized.append(mapping.get(key, key))
    return normalized