from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    GraphResponse,
    InvestigateRequest,
    InvestigateResponse,
    InvestigationProgressResponse,
    ReportResponse,
)
from app.services.investigation_service import investigation_store, start_investigation

router = APIRouter()


def _get_record_or_404(investigation_id: str):
    record = investigation_store.get(investigation_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return record


@router.post("/investigate", response_model=InvestigateResponse)
def investigate(request: InvestigateRequest) -> InvestigateResponse:
    record = start_investigation(request.query)
    return InvestigateResponse(
        investigation_id=record.id,
        status=record.status,
        question=record.question,
    )


@router.get("/investigation/{investigation_id}", response_model=InvestigationProgressResponse)
def get_investigation(investigation_id: str) -> InvestigationProgressResponse:
    record = _get_record_or_404(investigation_id)
    state = record.state
    complete = record.status in {"completed", "failed"}

    return InvestigationProgressResponse(
        investigation_id=record.id,
        status=record.status,
        question=record.question,
        complete=complete,
        steps=state.get("steps", []),
        evidence=state.get("evidence", []),
        findings=state.get("findings", []),
        events=record.events,
        confidence=state.get("confidence"),
        error=record.error,
    )


@router.get("/graph/{investigation_id}", response_model=GraphResponse)
def get_graph(investigation_id: str) -> GraphResponse:
    record = _get_record_or_404(investigation_id)
    return GraphResponse(
        investigation_id=record.id,
        status=record.status,
        graph_state=record.state.get("graph_state", {"nodes": [], "edges": []}),
    )


@router.get("/report/{investigation_id}", response_model=ReportResponse)
def get_report(investigation_id: str) -> ReportResponse:
    record = _get_record_or_404(investigation_id)
    report = record.state.get("report")
    ready = record.status == "completed" and bool(report)

    return ReportResponse(
        investigation_id=record.id,
        status=record.status,
        ready=ready,
        report=report,
        confidence=record.state.get("confidence"),
    )
