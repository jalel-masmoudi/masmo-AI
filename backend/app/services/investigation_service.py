from __future__ import annotations

import threading
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from app.agents.state import InvestigationState, initial_state
from app.agents.workflow import build_workflow

InvestigationStatus = Literal["pending", "running", "completed", "failed"]


class InvestigationRecord:
    def __init__(self, investigation_id: str, question: str) -> None:
        self.id = investigation_id
        self.question = question
        self.status: InvestigationStatus = "pending"
        self.state: InvestigationState = initial_state(question)
        self.events: list[dict[str, Any]] = []
        self.error: str | None = None
        self.created_at = datetime.now(UTC).isoformat()
        self.updated_at = self.created_at


class InvestigationStore:
    def __init__(self) -> None:
        self._records: dict[str, InvestigationRecord] = {}
        self._lock = threading.Lock()

    def create(self, question: str) -> InvestigationRecord:
        investigation_id = str(uuid.uuid4())
        record = InvestigationRecord(investigation_id, question)
        with self._lock:
            self._records[investigation_id] = record
        return record

    def get(self, investigation_id: str) -> InvestigationRecord | None:
        with self._lock:
            return self._records.get(investigation_id)

    def _append_event(self, record: InvestigationRecord, event: dict[str, Any]) -> None:
        event["timestamp"] = datetime.now(UTC).isoformat()
        record.events.append(event)
        record.updated_at = event["timestamp"]

    def _events_from_state(self, record: InvestigationRecord, state: InvestigationState) -> None:
        steps = state.get("steps", [])
        if not steps:
            return

        last_step = steps[-1]
        action = last_step.get("action")
        step_key = f"{action}:{len(steps)}"
        if getattr(record, "_last_step_key", None) == step_key:
            return
        record._last_step_key = step_key  # type: ignore[attr-defined]

        if action == "plan" and last_step.get("tool"):
            self._append_event(
                record,
                {
                    "type": "tool_started",
                    "tool": last_step.get("tool"),
                    "args": last_step.get("args", {}),
                    "reasoning": last_step.get("reasoning"),
                },
            )
        elif action == "execute":
            self._append_event(
                record,
                {
                    "type": "tool_completed",
                    "tool": last_step.get("tool"),
                    "args": last_step.get("args", {}),
                    "result_count": last_step.get("result_count"),
                },
            )
        elif action == "observe":
            self._append_event(
                record,
                {
                    "type": "evidence_found",
                    "tool": last_step.get("tool"),
                    "findings_added": last_step.get("findings_added", 0),
                    "evidence_added": last_step.get("evidence_added", 0),
                },
            )
            if state.get("graph_state", {}).get("nodes"):
                self._append_event(
                    record,
                    {
                        "type": "graph_updated",
                        "node_count": len(state["graph_state"].get("nodes", [])),
                        "edge_count": len(state["graph_state"].get("edges", [])),
                    },
                )
        elif action == "report":
            self._append_event(
                record,
                {
                    "type": "report_generated",
                    "confidence": last_step.get("confidence") or state.get("confidence"),
                },
            )

    def update_state(self, investigation_id: str, state: InvestigationState) -> None:
        with self._lock:
            record = self._records[investigation_id]
            record.state = state
            self._events_from_state(record, state)
            record.updated_at = datetime.now(UTC).isoformat()

    def set_status(
        self,
        investigation_id: str,
        status: InvestigationStatus,
        error: str | None = None,
    ) -> None:
        with self._lock:
            record = self._records[investigation_id]
            record.status = status
            record.error = error
            record.updated_at = datetime.now(UTC).isoformat()


investigation_store = InvestigationStore()


def _run_workflow(investigation_id: str, question: str) -> None:
    workflow = build_workflow()
    store = investigation_store

    store.set_status(investigation_id, "running")
    try:
        for state in workflow.stream(initial_state(question), stream_mode="values"):
            store.update_state(investigation_id, state)
        store.set_status(investigation_id, "completed")
    except Exception as exc:
        import traceback
        traceback.print_exc()
        store.set_status(investigation_id, "failed", error=str(exc))


def start_investigation(question: str) -> InvestigationRecord:
    record = investigation_store.create(question)
    thread = threading.Thread(
        target=_run_workflow,
        args=(record.id, question),
        daemon=True,
    )
    thread.start()
    return record
