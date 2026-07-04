from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.data_loader import get_projects
from app.tools.context import matches_query
from app.tools.summarize import summarize_results


class SearchProjectsInput(BaseModel):
    query: str = Field(description="Search query matched against project name or id")


class ProjectResult(BaseModel):
    id: str
    name: str
    status: str
    depends_on_system_ids: list[str] = Field(default_factory=list)
    blocked_by_ticket_ids: list[str] = Field(default_factory=list)


class SearchProjectsOutput(BaseModel):
    tool: str = "search_projects"
    query: str
    count: int
    truncated: bool = False
    results: list[ProjectResult]


def search_projects(query: str) -> dict:
    matches: list[ProjectResult] = []
    for project in get_projects():
        haystack = f"{project.get('id', '')} {project.get('name', '')}"
        if matches_query(haystack, query):
            matches.append(
                ProjectResult(
                    id=project["id"],
                    name=project["name"],
                    status=project.get("status", ""),
                    depends_on_system_ids=project.get("depends_on_system_ids", []),
                    blocked_by_ticket_ids=project.get("blocked_by_ticket_ids", []),
                )
            )

    summary = summarize_results([item.model_dump() for item in matches])
    output = SearchProjectsOutput(
        query=query,
        count=summary["total_count"],
        truncated=summary["truncated"],
        results=[ProjectResult(**item) for item in summary["results"]],
    )
    return output.model_dump()
