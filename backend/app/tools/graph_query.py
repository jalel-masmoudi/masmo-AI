from __future__ import annotations

from pydantic import BaseModel, Field

from app.tools.context import get_enterprise_graph
from app.tools.graph_utils import resolve_node_id


class GraphQueryInput(BaseModel):
    node_id: str = Field(description="Starting node id, e.g. project_phoenix or SYS-REDIS-01")
    depth: int = Field(default=2, ge=1, le=5, description="Traversal depth from the start node")


class GraphNode(BaseModel):
    id: str
    node_type: str | None = None
    name: str | None = None
    title: str | None = None
    status: str | None = None


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str | None = None


class GraphQueryOutput(BaseModel):
    tool: str = "graph_query"
    node_id: str
    depth: int
    count_nodes: int
    count_edges: int
    total_nodes: int
    truncated: bool
    nodes: list[GraphNode]
    edges: list[GraphEdge]


def graph_query(node_id: str, depth: int = 2) -> dict:
    graph = get_enterprise_graph()
    resolved_id = resolve_node_id(graph, node_id)
    subgraph = graph.get_subgraph(resolved_id, depth)

    nodes = [
        GraphNode(
            id=node["id"],
            node_type=node.get("node_type"),
            name=node.get("name"),
            title=node.get("title"),
            status=node.get("status"),
        )
        for node in subgraph["nodes"]
    ]
    edges = [GraphEdge(**edge) for edge in subgraph["edges"]]

    output = GraphQueryOutput(
        node_id=resolved_id,
        depth=depth,
        count_nodes=len(nodes),
        count_edges=len(edges),
        total_nodes=subgraph.get("total_nodes", len(nodes)),
        truncated=subgraph.get("truncated", False),
        nodes=nodes,
        edges=edges,
    )
    return output.model_dump()
