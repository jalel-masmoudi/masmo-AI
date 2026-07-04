from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.services.data_loader import get_incidents, get_projects, get_tickets
from app.tools.summarize import summarize_results


class TimelineBuilderInput(BaseModel):
    project_id: str | None = Field(default=None, description="Build timeline for a project scope")
    incident_id: str | None = Field(default=None, description="Build timeline for an incident scope")
    system_id: str | None = Field(default=None, description="Build timeline for a system scope")


class TimelineEvent(BaseModel):
    at: str
    event: str
    source_type: str
    source_id: str


class TimelineBuilderOutput(BaseModel):
    tool: str = "timeline_builder"
    scope: dict[str, str | None]
    count: int
    truncated: bool = False
    events: list[TimelineEvent]


def _parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.min
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is not None:
            return parsed.replace(tzinfo=None)
        return parsed
    except ValueError:
        return datetime.min


def _ticket_node_id(raw_id: str) -> str:
    return raw_id if raw_id.startswith("ticket_") else f"ticket_{raw_id}"


def _incident_node_id(raw_id: str) -> str:
    return raw_id if raw_id.startswith("incident_") else f"incident_{raw_id}"


def timeline_builder(
    project_id: str | None = None,
    incident_id: str | None = None,
    system_id: str | None = None,
) -> dict:
    if not any([project_id, incident_id, system_id]):
        project_id = "project_phoenix"

    events: list[TimelineEvent] = []

    for ticket in get_tickets():
        if project_id and ticket.get("project_id") != project_id:
            continue
        if system_id and ticket.get("system_id") != system_id:
            continue
        if incident_id:
            related = ticket.get("related_incident_ids", [])
            if incident_id not in related and _incident_node_id(incident_id) not in related:
                continue

        ticket_id = ticket["id"]
        if created := ticket.get("created_at"):
            events.append(
                TimelineEvent(
                    at=created,
                    event=f"Ticket {ticket_id} created — {ticket.get('title', '')}",
                    source_type="ticket",
                    source_id=ticket_id,
                )
            )
        if updated := ticket.get("updated_at"):
            events.append(
                TimelineEvent(
                    at=updated,
                    event=f"Ticket {ticket_id} updated — status {ticket.get('status', 'unknown')}",
                    source_type="ticket",
                    source_id=ticket_id,
                )
            )

    for incident in get_incidents():
        if incident_id and incident.get("id") != incident_id:
            continue
        if system_id and incident.get("system_id") != system_id:
            continue
        if project_id and project_id not in incident.get("affected_project_ids", []):
            if not incident_id:
                continue

        incident_key = incident["id"]
        if started := incident.get("started_at"):
            events.append(
                TimelineEvent(
                    at=started,
                    event=f"Incident {incident_key} opened — {incident.get('title', '')}",
                    source_type="incident",
                    source_id=incident_key,
                )
            )
        for item in incident.get("timeline", []):
            if isinstance(item, str):
                parts = item.split(" - ", 1)
                at = parts[0] if len(parts) > 1 else incident.get("updated_at", "")
                event = parts[1] if len(parts) > 1 else item
            else:
                at = item.get("at", incident.get("updated_at", ""))
                event = item.get("event", "Incident event")
                
            events.append(
                TimelineEvent(
                    at=at,
                    event=event,
                    source_type="incident",
                    source_id=incident_key,
                )
            )

    for project in get_projects():
        if project_id and project.get("id") != project_id:
            continue
        if not project_id:
            continue
        if target := project.get("target_launch"):
            events.append(
                TimelineEvent(
                    at=target,
                    event=f"Original launch target for {project.get('name', project['id'])}",
                    source_type="project",
                    source_id=project["id"],
                )
            )
        if revised := project.get("revised_launch"):
            events.append(
                TimelineEvent(
                    at=revised,
                    event=f"Revised launch date for {project.get('name', project['id'])}",
                    source_type="project",
                    source_id=project["id"],
                )
            )

    events.sort(key=lambda item: _parse_timestamp(item.at))
    summary = summarize_results([item.model_dump() for item in events], limit=20)

    output = TimelineBuilderOutput(
        scope={
            "project_id": project_id,
            "incident_id": incident_id,
            "system_id": system_id,
        },
        count=summary["total_count"],
        truncated=summary["truncated"],
        events=[TimelineEvent(**item) for item in summary["results"]],
    )
    return output.model_dump()
