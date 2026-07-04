"""End-to-end verification that Masmo investigations are grounded in mock data."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Deterministic, fast path — avoids hanging on slow/unavailable LLM endpoints.
os.environ.setdefault("MASMO_HEURISTIC_ONLY", "1")

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient

from app.main import app

REQUIRED_EVIDENCE_MARKERS = (
    "Phoenix",
    "OPS-402",
    "Redis",
    "INC-2024-089",
)

REQUIRED_GRAPH_NODE_TYPES = {"project", "ticket", "incident", "system"}


def run_e2e() -> None:
    client = TestClient(app)
    query = "Why is Project Phoenix delayed?"

    start = client.post("/investigate", json={"query": query})
    assert start.status_code == 200, start.text
    investigation_id = start.json()["investigation_id"]

    progress = None
    for _ in range(60):
        response = client.get(f"/investigation/{investigation_id}")
        assert response.status_code == 200, response.text
        progress = response.json()
        if progress["complete"]:
            break
        time.sleep(0.3)

    assert progress is not None
    assert progress["complete"], f"Investigation did not complete: {progress['status']}"
    assert progress["status"] == "completed"
    assert len(progress["steps"]) > 0, "Expected investigation steps"
    assert len(progress["evidence"]) > 0, "Expected grounded evidence"
    assert len(progress["findings"]) > 0, "Expected findings"
    assert len(progress["events"]) > 0, "Expected lifecycle events"

    graph = client.get(f"/graph/{investigation_id}").json()
    graph_nodes = graph["graph_state"]["nodes"]
    graph_edges = graph["graph_state"]["edges"]
    assert len(graph_nodes) > 0, "Expected graph nodes"
    assert len(graph_edges) > 0, "Expected graph edges"

    node_types = {node.get("node_type") for node in graph_nodes}
    missing_types = REQUIRED_GRAPH_NODE_TYPES - node_types
    assert not missing_types, f"Missing expected graph node types: {missing_types}"

    report = client.get(f"/report/{investigation_id}").json()
    assert report["ready"], "Expected final report to be ready"
    assert report["report"], "Expected report body"

    combined = " ".join(
        [
            report["report"] or "",
            " ".join(progress["evidence"]),
            " ".join(progress["findings"]),
        ]
    )
    for marker in REQUIRED_EVIDENCE_MARKERS:
        assert marker in combined, f"Missing grounded marker in investigation output: {marker}"

    health = client.get("/health").json()
    assert health["status"] == "ok"

    voice_status = client.get("/voice/status").json()
    assert "languages" in voice_status
    assert len(voice_status["languages"]) >= 5

    print("E2E PASS")
    print(f"  investigation_id: {investigation_id}")
    print(f"  steps: {len(progress['steps'])}")
    print(f"  evidence: {len(progress['evidence'])}")
    print(f"  findings: {len(progress['findings'])}")
    print(f"  graph nodes: {len(graph_nodes)}")
    print(f"  confidence: {(report.get('confidence') or '')[:60]}")
    print(f"  gradium: {voice_status.get('gradium_configured')}")
    print(f"  heuristic_only: {health.get('heuristic_only')}")


if __name__ == "__main__":
    try:
        run_e2e()
    except AssertionError as exc:
        print(f"E2E FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
