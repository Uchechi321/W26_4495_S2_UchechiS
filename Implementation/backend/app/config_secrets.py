"""Shared reading of API keys from the environment (handles quotes / whitespace)."""

import os


def get_openai_api_key() -> str:
    for name in ("OPENAI_API_KEY", "OPENAI_KEY"):
        raw = os.environ.get(name)
        if not raw:
            continue
        v = str(raw).strip().strip('"').strip("'")
        if v:
            return v
    return ""
