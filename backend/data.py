"""Loads the bundled synthetic driver book and explanation cache."""
from __future__ import annotations

import json
import os
from functools import lru_cache

_HERE = os.path.dirname(os.path.abspath(__file__))
# DATA_DIR env lets the Lambda package place data/ alongside the code; falls
# back to the local ../data layout for dev.
_DATA_DIR = os.environ.get("DATA_DIR") or os.path.normpath(os.path.join(_HERE, "..", "data"))


@lru_cache(maxsize=1)
def load_drivers() -> list[dict]:
    path = os.path.join(_DATA_DIR, "drivers.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def load_explain_cache() -> dict:
    path = os.path.join(_DATA_DIR, "explain_cache.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def get_driver(driver_id: str) -> dict | None:
    for d in load_drivers():
        if d["id"] == driver_id:
            return d
    return None
