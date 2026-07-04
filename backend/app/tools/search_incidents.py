from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.data_loader import get_incidents
from app.tools.summarize import summarize_results, summarize_text


class IncidentTimelineEvent(BaseModel):
    at: str
    event: str


class SearchIncidentsInput(BaseModel):
    status: str | None = Field(default=None, description="Filter incidents by status, e.g. investigating")
    system_id: str | None = Field(default=None, description="Filter incidents affecting a system, e.g. SYS-REDIS-01")


class IncidentResult(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    system_id: str | None = None
    summary: str | None = None
    timeline: list[IncidentTimelineEvent] = Field(default_factory=list)


class SearchIncidentsOutput(BaseModel):
    tool: str = "search_incidents"
    status: str | None = None
    system_id: str | None = None
    count: int
    truncated: bool = False
    results: list[IncidentResult]


ACTIVE_STATUSES = {"investigating", "active", "open", "triggered"}


def search_incidents(status: str | None = None, system_id: str | None = None) -> dict:
    matches: list[IncidentResult] = []
    for incident in get_incidents():
        incident_status = incident.get("status", "")
        incident_system = incident.get("system_id")

        if status and incident_status.lower() != status.lower():
            continue
        if system_id and incident_system != system_id:
            continue
        if not status and not system_id and incident_status.lower() not in ACTIVE_STATUSES:
            continue

        timeline = [
            IncidentTimelineEvent(**event)
            for event in incident.get("timeline", [])
        ]
        matches.append(
            IncidentResult(
                id=incident["id"],
                title=incident["title"],
                severity=incident.get("severity", ""),
                status=incident_status,
                system_id=incident_system,
                summary=summarize_text(incident.get("summary", "")),
                timeline=timeline,
            )
        )

    summary = summarize_results([item.model_dump() for item in matches])
    output = SearchIncidentsOutput(
        status=status,
        system_id=system_id,
        count=summary["total_count"],
        truncated=summary["truncated"],
        results=[IncidentResult(**item) for item in summary["results"]],
    )
    return output.model_dump()
