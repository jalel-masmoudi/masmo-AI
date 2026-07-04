from __future__ import annotations

from app.graph.enterprise_graph import EnterpriseGraph
from app.services.data_loader import load_mock_data

_graph: EnterpriseGraph | None = None


def get_enterprise_graph() -> EnterpriseGraph:
    global _graph
    if _graph is None:
        _graph = EnterpriseGraph()
        _graph.build_from_mock_data(load_mock_data())
    return _graph


def reset_enterprise_graph() -> None:
    global _graph
    _graph = None


def matches_query(text: str, query: str) -> bool:
    return query.lower() in text.lower()
