import json
from pathlib import Path
from typing import Any

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "mock_db.json"

_cache: dict[str, Any] | None = None


def load_mock_data() -> dict[str, Any]:
    """Load mock enterprise data from JSON and return as a dictionary."""
    global _cache
    if _cache is None:
        with _DATA_PATH.open(encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


def get_employees() -> list[dict[str, Any]]:
    return load_mock_data()["employees"]


def get_projects() -> list[dict[str, Any]]:
    return load_mock_data()["projects"]


def get_tickets() -> list[dict[str, Any]]:
    return load_mock_data()["tickets"]


def get_incidents() -> list[dict[str, Any]]:
    return load_mock_data()["incidents"]


def get_documents() -> list[dict[str, Any]]:
    return load_mock_data()["documents"]


def get_services() -> list[dict[str, Any]]:
    return get_systems()


def get_systems() -> list[dict[str, Any]]:
    return load_mock_data()["systems"]


def get_vendors() -> list[dict[str, Any]]:
    return load_mock_data()["vendors"]


def get_by_id(collection: str, entity_id: str) -> dict[str, Any] | None:
    """Look up a single entity by id within a top-level collection."""
    for item in load_mock_data().get(collection, []):
        if item.get("id") == entity_id:
            return item
    return None
