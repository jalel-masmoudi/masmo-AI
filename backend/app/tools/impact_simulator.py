from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.services.data_loader import get_by_id, get_incidents, get_projects, get_systems, get_tickets
from app.tools.dependency_finder import dependency_finder


class ImpactSimulatorInput(BaseModel):
    project_id: str = Field(
        default="project_phoenix",
        description="Project to simulate downstream business impact for",
    )


class ImpactedEntity(BaseModel):
    id: str
    entity_type: str
    name: str
    status: str | None = None
    impact: str


class ImpactSimulatorOutput(BaseModel):
    tool: str = "impact_simulator"
    project_id: str
    severity: str
    launch_delay_days: int | None = None
    summary: str
    impacted_projects: list[ImpactedEntity]
    impacted_systems: list[ImpactedEntity]
    blocked_tickets: list[ImpactedEntity]
    active_incidents: list[ImpactedEntity]
    recommendations: list[str]


def _days_between(start: str | None, end: str | None) -> int | None:
    if not start or not end:
        return None
    try:
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        if start_dt.tzinfo is not None:
            start_dt = start_dt.replace(tzinfo=None)
            
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        if end_dt.tzinfo is not None:
            end_dt = end_dt.replace(tzinfo=None)
            
        return max((end_dt - start_dt).days, 0)
    except ValueError:
        return None


def impact_simulator(project_id: str = "project_phoenix") -> dict:
    project = get_by_id("projects", project_id)
    if not project:
        output = ImpactSimulatorOutput(
            project_id=project_id,
            severity="unknown",
            summary=f"No project found for id {project_id}.",
            impacted_projects=[],
            impacted_systems=[],
            blocked_tickets=[],
            active_incidents=[],
            recommendations=["Verify the project id and rerun impact simulation."],
        )
        return output.model_dump()

    dependency_data = dependency_finder(node_id=project_id, direction="both", max_depth=4)
    terminal_ids = {
        path["terminal_node_id"]
        for path in dependency_data.get("dependencies", [])
    }

    impacted_systems: list[ImpactedEntity] = []
    for system_id in project.get("depends_on_system_ids", []):
        system = get_by_id("systems", system_id)
        if not system:
            continue
        impact = "Operational risk"
        if system.get("status") == "degraded":
            impact = "Degraded production dependency blocking delivery"
        elif system.get("status") == "blocked":
            impact = "Blocked staging dependency halting validation"
        impacted_systems.append(
            ImpactedEntity(
                id=system_id,
                entity_type="system",
                name=system.get("name", system_id),
                status=system.get("status"),
                impact=impact,
            )
        )

    blocked_tickets: list[ImpactedEntity] = []
    for ticket_id in project.get("blocked_by_ticket_ids", []):
        ticket = get_by_id("tickets", ticket_id)
        if not ticket:
            continue
        blocked_tickets.append(
            ImpactedEntity(
                id=ticket_id,
                entity_type="ticket",
                name=ticket.get("title", ticket_id),
                status=ticket.get("status"),
                impact="Direct blocker on project delivery path",
            )
        )

    active_incidents: list[ImpactedEntity] = []
    for incident in get_incidents():
        if project_id not in incident.get("affected_project_ids", []):
            continue
        if incident.get("status") not in {"investigating", "active", "open", "triggered"}:
            continue
        active_incidents.append(
            ImpactedEntity(
                id=incident["id"],
                entity_type="incident",
                name=incident.get("title", incident["id"]),
                status=incident.get("status"),
                impact=f"{incident.get('severity', 'Incident')} affecting dependent systems",
            )
        )

    impacted_projects = [
        ImpactedEntity(
            id=project["id"],
            entity_type="project",
            name=project.get("name", project_id),
            status=project.get("status"),
            impact="Primary project under investigation",
        )
    ]

    launch_delay_days = _days_between(project.get("target_launch"), project.get("revised_launch"))
    degraded_systems = [system for system in impacted_systems if system.status == "degraded"]
    blocked_count = len(blocked_tickets)

    if active_incidents and degraded_systems and blocked_count:
        severity = "critical"
    elif active_incidents or blocked_count:
        severity = "high"
    elif project.get("status") == "delayed":
        severity = "medium"
    else:
        severity = "low"

    summary_parts = [
        f"{project.get('name', project_id)} is {project.get('status', 'unknown')}.",
    ]
    if launch_delay_days is not None:
        summary_parts.append(f"Launch delay estimated at {launch_delay_days} days.")
    if degraded_systems:
        summary_parts.append(
            f"{len(degraded_systems)} dependent system(s) are degraded, including {degraded_systems[0].name}."
        )
    if blocked_tickets:
        summary_parts.append(
            f"{len(blocked_tickets)} ticket(s) are blocking delivery, including {blocked_tickets[0].id}."
        )
    if active_incidents:
        summary_parts.append(
            f"{len(active_incidents)} active incident(s) are affecting the project."
        )

    recommendations = [
        "Stabilize degraded systems before resuming blocked deployment tickets.",
        "Resolve active incidents on critical dependencies first.",
        "Re-baseline the launch plan after dependency recovery.",
    ]
    if terminal_ids:
        recommendations.append(
            f"Review dependency paths touching {len(terminal_ids)} downstream graph node(s)."
        )

    output = ImpactSimulatorOutput(
        project_id=project_id,
        severity=severity,
        launch_delay_days=launch_delay_days,
        summary=" ".join(summary_parts),
        impacted_projects=impacted_projects,
        impacted_systems=impacted_systems,
        blocked_tickets=blocked_tickets,
        active_incidents=active_incidents,
        recommendations=recommendations,
    )
    return output.model_dump()
