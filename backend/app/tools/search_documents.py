from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.data_loader import get_documents
from app.tools.context import matches_query
from app.tools.summarize import summarize_results, summarize_text


class SearchDocumentsInput(BaseModel):
    query: str = Field(description="Search query matched against document title and content")


class DocumentResult(BaseModel):
    id: str
    title: str
    content: str
    project_id: str | None = None
    system_ids: list[str] = Field(default_factory=list)


class SearchDocumentsOutput(BaseModel):
    tool: str = "search_documents"
    query: str
    count: int
    truncated: bool = False
    results: list[DocumentResult]


def search_documents(query: str) -> dict:
    matches: list[DocumentResult] = []
    for doc in get_documents():
        haystack = f"{doc.get('title', '')} {doc.get('content', '')}"
        if matches_query(haystack, query):
            matches.append(
                DocumentResult(
                    id=doc["id"],
                    title=doc["title"],
                    content=summarize_text(doc.get("content", "")),
                    project_id=doc.get("project_id"),
                    system_ids=doc.get("system_ids", []),
                )
            )

    summary = summarize_results([item.model_dump() for item in matches])
    output = SearchDocumentsOutput(
        query=query,
        count=summary["total_count"],
        truncated=summary["truncated"],
        results=[DocumentResult(**item) for item in summary["results"]],
    )
    return output.model_dump()
