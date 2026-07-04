from __future__ import annotations

from collections import deque
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.tools.context import get_enterprise_graph
from app.tools.graph_utils import resolve_node_id
from app.tools.summarize import summarize_results


class DependencyFinderInput(BaseModel):
    node_id: str = Field(description="Starting node id, e.g. project_phoenix or SYS-REDIS-01")
    direction: Literal["upstream", "downstream", "both"] = Field(
        default="both",
        description="Traverse incoming blockers/dependencies, outgoing effects, or both",
    )
    relation_types: list[str] = Field(
        default_factory=lambda: ["depends_on", "blocked_by", "affects"],
        description="Edge relations to follow",
    )
    max_depth: int = Field(default=4, ge=1, le=6)


class DependencyPath(BaseModel):
    path: list[str]
    relations: list[str]
    terminal_node_id: str
    terminal_node_type: str | None = None


class DependencyFinderOutput(BaseModel):
    tool: str = "dependency_finder"
    node_id: str
    direction: str
    count: int
    truncated: bool = False
    dependencies: list[DependencyPath]


def _neighbors(
    graph,
    node_id: str,
    direction: str,
    relation_types: set[str],
) -> list[tuple[str, str]]:
    matches: list[tuple[str, str]] = []

    if direction in {"downstream", "both"}:
        for _, target, data in graph.out_edges(node_id, data=True):
            relation = data.get("relation")
            if relation in relation_types:
                matches.append((target, relation))

    if direction in {"upstream", "both"}:
        for source, _, data in graph.in_edges(node_id, data=True):
            relation = data.get("relation")
            if relation in relation_types:
                matches.append((source, relation))

    return matches


def dependency_finder(
    node_id: str,
    direction: Literal["upstream", "downstream", "both"] = "both",
    relation_types: list[str] | None = None,
    max_depth: int = 4,
) -> dict:
    graph = get_enterprise_graph()
    resolved_id = resolve_node_id(graph, node_id)
    relations = set(relation_types or ["depends_on", "blocked_by", "affects"])

    paths: list[DependencyPath] = []
    queue: deque[tuple[str, list[str], list[str]]] = deque([(resolved_id, [resolved_id], [])])
    visited_paths: set[tuple[str, ...]] = set()

    while queue:
        current, path, rels = queue.popleft()
        if len(path) > 1:
            node_type = graph.graph.nodes.get(current, {}).get("node_type")
            paths.append(
                DependencyPath(
                    path=path,
                    relations=rels,
                    terminal_node_id=current,
                    terminal_node_type=node_type,
                )
            )

        if len(path) >= max_depth + 1:
            continue

        for neighbor, relation in _neighbors(graph.graph, current, direction, relations):
            if neighbor in path:
                continue
            next_path = (*path, neighbor)
            if next_path in visited_paths:
                continue
            visited_paths.add(next_path)
            queue.append((neighbor, list(next_path), [*rels, relation]))

    summary = summarize_results([item.model_dump() for item in paths], limit=15)
    output = DependencyFinderOutput(
        node_id=resolved_id,
        direction=direction,
        count=summary["total_count"],
        truncated=summary["truncated"],
        dependencies=[DependencyPath(**item) for item in summary["results"]],
    )
    return output.model_dump()
