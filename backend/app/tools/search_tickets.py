from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.data_loader import get_tickets
from app.tools.context import matches_query
from app.tools.summarize import summarize_results


class SearchTicketsInput(BaseModel):
    query: str = Field(default="", description="Substring match against ticket title")
    project_id: str | None = Field(default=None, description="Optional project id filter")


class TicketResult(BaseModel):
    id: str
    title: str
    type: str
    status: str
    project_id: str | None = None
    system_id: str | None = None
    blocked_by_ticket_ids: list[str] = Field(default_factory=list)


class SearchTicketsOutput(BaseModel):
    tool: str = "search_tickets"
    query: str
    project_id: str | None = None
    count: int
    truncated: bool = False
    results: list[TicketResult]


def search_tickets(query: str = "", project_id: str | None = None) -> dict:
    matches: list[TicketResult] = []
    for ticket in get_tickets():
        if project_id and ticket.get("project_id") != project_id:
            continue
        if query and not matches_query(ticket.get("title", ""), query):
            continue
        if not query and not project_id:
            continue

        matches.append(
            TicketResult(
                id=ticket["id"],
                title=ticket["title"],
                type=ticket.get("type", ""),
                status=ticket.get("status", ""),
                project_id=ticket.get("project_id"),
                system_id=ticket.get("system_id"),
                blocked_by_ticket_ids=ticket.get("blocked_by_ticket_ids", []),
            )
        )

    summary = summarize_results([item.model_dump() for item in matches])
    output = SearchTicketsOutput(
        query=query,
        project_id=project_id,
        count=summary["total_count"],
        truncated=summary["truncated"],
        results=[TicketResult(**item) for item in summary["results"]],
    )
    return output.model_dump()
