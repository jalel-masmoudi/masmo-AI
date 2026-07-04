from __future__ import annotations

from collections import deque
from typing import Any

import networkx as nx

from app.tools.summarize import MAX_GRAPH_NODES


class EnterpriseGraph:
    """NetworkX-backed enterprise knowledge graph."""

    def __init__(self) -> None:
        self.graph: nx.MultiDiGraph = nx.MultiDiGraph()

    def add_node(self, node_id: str, node_type: str, properties: dict[str, Any] | None = None) -> None:
        props = dict(properties or {})
        props["node_type"] = node_type
        self.graph.add_node(node_id, **props)

    def add_edge(self, source_id: str, target_id: str, relation_type: str) -> None:
        self.graph.add_edge(source_id, target_id, relation=relation_type)

    @staticmethod
    def _ticket_id(raw_id: str) -> str:
        return raw_id if raw_id.startswith("ticket_") else f"ticket_{raw_id}"

    @staticmethod
    def _incident_id(raw_id: str) -> str:
        return raw_id if raw_id.startswith("incident_") else f"incident_{raw_id}"

    def build_from_mock_data(self, mock_data: dict[str, Any]) -> None:
        """Populate the graph using tool_schema.md node and edge definitions."""
        self.graph.clear()

        for employee in mock_data.get("employees", []):
            self.add_node(
                employee["id"],
                "employee",
                {
                    "id": employee["id"],
                    "name": employee.get("name"),
                    "role": employee.get("role"),
                    "department": employee.get("department") or employee.get("team"),
                },
            )

        for system in mock_data.get("systems", []):
            self.add_node(
                system["id"],
                "system",
                {
                    "id": system["id"],
                    "name": system.get("name"),
                    "status": system.get("status"),
                },
            )
            for dependency_id in system.get("depends_on_system_ids", []):
                self.add_edge(system["id"], dependency_id, "depends_on")

        for project in mock_data.get("projects", []):
            self.add_node(
                project["id"],
                "project",
                {
                    "id": project["id"],
                    "name": project.get("name"),
                    "status": project.get("status"),
                },
            )

            if pm_id := project.get("pm_id"):
                self.add_edge(pm_id, project["id"], "owns")
            if lead_id := project.get("engineering_lead_id"):
                self.add_edge(lead_id, project["id"], "owns")

            for system_id in project.get("depends_on_system_ids", []):
                self.add_edge(project["id"], system_id, "depends_on")

            for ticket_id in project.get("blocked_by_ticket_ids", []):
                self.add_edge(project["id"], self._ticket_id(ticket_id), "blocked_by")

        for ticket in mock_data.get("tickets", []):
            node_id = self._ticket_id(ticket["id"])
            self.add_node(
                node_id,
                "ticket",
                {
                    "id": ticket["id"],
                    "title": ticket.get("title"),
                    "type": ticket.get("type"),
                    "status": ticket.get("status"),
                },
            )

            if assignee_id := ticket.get("assignee_id"):
                self.add_edge(assignee_id, node_id, "owns")
                self.add_edge(node_id, assignee_id, "assigned_to")

            for blocked_id in ticket.get("blocked_by_ticket_ids", []):
                self.add_edge(node_id, self._ticket_id(blocked_id), "blocked_by")

        for incident in mock_data.get("incidents", []):
            node_id = self._incident_id(incident["id"])
            self.add_node(
                node_id,
                "incident",
                {
                    "id": incident["id"],
                    "title": incident.get("title"),
                    "severity": incident.get("severity"),
                    "status": incident.get("status"),
                },
            )

            if system_id := incident.get("system_id"):
                self.add_edge(node_id, system_id, "affects")

            assignees = set(incident.get("responder_ids", []))
            if commander_id := incident.get("commander_id"):
                assignees.add(commander_id)
            for employee_id in assignees:
                self.add_edge(node_id, employee_id, "assigned_to")

        for document in mock_data.get("documents", []):
            self.add_node(
                document["id"],
                "document",
                {
                    "id": document["id"],
                    "title": document.get("title"),
                },
            )

            if project_id := document.get("project_id"):
                self.add_edge(project_id, document["id"], "documented_in")

            for system_id in document.get("system_ids", []):
                self.add_edge(system_id, document["id"], "documented_in")

    def get_subgraph(self, start_node_id: str, max_depth: int, max_nodes: int = MAX_GRAPH_NODES) -> dict[str, Any]:
        """Return nodes and edges within max_depth hops, traversing edges bidirectionally."""
        if start_node_id not in self.graph:
            return {"nodes": [], "edges": [], "truncated": False, "total_nodes": 0}

        visited: dict[str, int] = {start_node_id: 0}
        queue: deque[tuple[str, int]] = deque([(start_node_id, 0)])

        while queue:
            current, depth = queue.popleft()
            if depth >= max_depth:
                continue

            neighbors: set[str] = set(self.graph.successors(current)) | set(self.graph.predecessors(current))
            for neighbor in neighbors:
                if neighbor not in visited:
                    visited[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))

        ordered_node_ids = sorted(visited, key=lambda node_id: (visited[node_id], node_id))
        truncated = len(ordered_node_ids) > max_nodes
        if truncated:
            ordered_node_ids = ordered_node_ids[:max_nodes]

        kept_nodes = set(ordered_node_ids)
        subgraph = self.graph.subgraph(kept_nodes)
        nodes = [
            {"id": node_id, **{k: v for k, v in data.items() if k != "node_type"}, "node_type": data.get("node_type")}
            for node_id, data in subgraph.nodes(data=True)
        ]
        edges = [
            {
                "source": source,
                "target": target,
                "relation": data.get("relation"),
            }
            for source, target, data in subgraph.edges(data=True)
            if source in kept_nodes and target in kept_nodes
        ]

        return {
            "nodes": nodes,
            "edges": edges,
            "truncated": truncated,
            "total_nodes": len(visited),
        }

    @property
    def node_count(self) -> int:
        return self.graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self.graph.number_of_edges()
