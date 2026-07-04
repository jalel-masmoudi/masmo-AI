from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class InvestigateRequest(BaseModel):
    query: str = Field(min_length=1, description="Investigation question")


class InvestigateResponse(BaseModel):
    investigation_id: str
    status: str
    question: str


class InvestigationProgressResponse(BaseModel):
    investigation_id: str
    status: str
    question: str
    complete: bool
    steps: list[dict[str, Any]]
    evidence: list[str]
    findings: list[str]
    events: list[dict[str, Any]]
    confidence: str | None = None
    error: str | None = None


class GraphResponse(BaseModel):
    investigation_id: str
    status: str
    graph_state: dict[str, Any]


class ReportResponse(BaseModel):
    investigation_id: str
    status: str
    ready: bool
    report: str | None = None
    confidence: str | None = None


class VoiceLanguage(BaseModel):
    code: str
    label: str


class VoiceStatusResponse(BaseModel):
    gradium_configured: bool
    languages: list[VoiceLanguage]


class TTSRequest(BaseModel):
    text: str = Field(min_length=1)
    language: str = "en"


class TranslateReportRequest(BaseModel):
    report: str = Field(min_length=1)
    language: str = "en"


class TranslateReportResponse(BaseModel):
    language: str
    report: str
    provider: str
