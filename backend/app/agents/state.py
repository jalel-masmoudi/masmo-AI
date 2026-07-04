from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


class InvestigationState(TypedDict, total=False):
    question: str
    steps: Annotated[list[dict[str, Any]], operator.add]
    tool_outputs: Annotated[list[dict[str, Any]], operator.add]
    evidence: Annotated[list[str], operator.add]
    graph_state: dict[str, Any]
    findings: Annotated[list[str], operator.add]
    confidence: str | None
    report: str | None
    next_tool: str | None
    next_tool_args: dict[str, Any]
    should_report: bool


def initial_state(question: str) -> InvestigationState:
    return InvestigationState(
        question=question,
        steps=[],
        tool_outputs=[],
        evidence=[],
        graph_state={"nodes": [], "edges": []},
        findings=[],
        confidence=None,
        report=None,
        next_tool=None,
        next_tool_args={},
        should_report=False,
    )
