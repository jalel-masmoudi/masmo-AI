from __future__ import annotations

from typing import Any

MAX_TOOL_RESULTS = 10
MAX_GRAPH_NODES = 50


def summarize_results(results: list[dict[str, Any]], limit: int = MAX_TOOL_RESULTS) -> dict[str, Any]:
    """Truncate tool result lists to keep LLM context small."""
    if len(results) <= limit:
        return {"results": results, "truncated": False, "total_count": len(results)}
    return {
        "results": results[:limit],
        "truncated": True,
        "total_count": len(results),
    }


def summarize_text(value: str, max_length: int = 240) -> str:
    if len(value) <= max_length:
        return value
    return value[: max_length - 3] + "..."
