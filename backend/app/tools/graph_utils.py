from __future__ import annotations

from app.graph.enterprise_graph import EnterpriseGraph


def resolve_node_id(graph: EnterpriseGraph, node_id: str) -> str:
    if node_id in graph.graph:
        return node_id

    candidates = [
        node_id,
        f"ticket_{node_id}",
        f"incident_{node_id}",
        f"project_{node_id}",
        f"employee_{node_id}",
        f"system_{node_id}",
    ]
    for candidate in candidates:
        if candidate in graph.graph:
            return candidate

    query = node_id.lower()
    for nid, data in graph.graph.nodes(data=True):
        label = str(data.get("name") or data.get("title") or "").lower()
        if query in label or query in nid.lower():
            return nid

    return node_id
