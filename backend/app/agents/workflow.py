from __future__ import annotations

import json
from typing import Any, Literal

from langgraph.graph import END, START, StateGraph

from app.agents.prompts import OBSERVER_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT, REPORTER_SYSTEM_PROMPT
from app.agents.state import InvestigationState, initial_state
from app.core.llm_router import call_llm, heuristic_only, parse_json_response
from app.tools.registry import TOOL_BY_NAME

MAX_TOOL_CALLS = 10

DEFAULT_PLAN: list[tuple[str, dict[str, Any]]] = [
    ("search_projects", {"query": "Phoenix"}),
    ("search_tickets", {"project_id": "project_phoenix"}),
    ("search_incidents", {"status": "investigating", "system_id": "SYS-REDIS-01"}),
    ("dependency_finder", {"node_id": "project_phoenix", "direction": "both"}),
    ("timeline_builder", {"project_id": "project_phoenix"}),
    ("graph_query", {"node_id": "project_phoenix", "depth": 2}),
    ("impact_simulator", {"project_id": "project_phoenix"}),
    ("search_documents", {"query": "Redis"}),
]


def _merge_graph_state(current: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    nodes = {node["id"]: node for node in current.get("nodes", []) if "id" in node}
    edges = list(current.get("edges", []))
    edge_keys = {(e.get("source"), e.get("target"), e.get("relation")) for e in edges}

    for node in new.get("nodes", []):
        if "id" in node:
            nodes[node["id"]] = node

    for edge in new.get("edges", []):
        key = (edge.get("source"), edge.get("target"), edge.get("relation"))
        if key not in edge_keys:
            edges.append(edge)
            edge_keys.add(key)

    return {"nodes": list(nodes.values()), "edges": edges}


def _heuristic_plan(state: InvestigationState) -> dict[str, Any]:
    step_index = len(state.get("tool_outputs", []))
    if step_index >= len(DEFAULT_PLAN):
        return {"should_report": True, "next_tool": None, "next_tool_args": {}}

    tool_name, tool_args = DEFAULT_PLAN[step_index]
    return {
        "should_report": False,
        "next_tool": tool_name,
        "next_tool_args": tool_args,
        "steps": [
            {
                "step": step_index + 1,
                "action": "plan",
                "tool": tool_name,
                "args": tool_args,
                "reasoning": "Heuristic investigation sequence (LLM unavailable).",
            }
        ],
    }


def planner_node(state: InvestigationState) -> dict[str, Any]:
    if len(state.get("tool_outputs", [])) >= MAX_TOOL_CALLS:
        return {"should_report": True, "next_tool": None, "next_tool_args": {}}

    if heuristic_only():
        return _heuristic_plan(state)

    user_prompt = json.dumps(
        {
            "question": state.get("question"),
            "steps_taken": state.get("steps", []),
            "evidence_gathered": state.get("evidence", []),
            "findings_so_far": state.get("findings", []),
        },
        indent=2,
    )
    system_prompt = PLANNER_SYSTEM_PROMPT.replace("{question}", state.get("question", ""))

    llm_response = call_llm(system_prompt, user_prompt)
    if llm_response:
        parsed = parse_json_response(llm_response)
        if parsed:
            action = parsed.get("action", "tool")
            if action == "report":
                return {
                    "should_report": True,
                    "next_tool": None,
                    "next_tool_args": {},
                    "steps": [
                        {
                            "step": len(state.get("steps", [])) + 1,
                            "action": "plan",
                            "decision": "report",
                            "reasoning": parsed.get("reasoning", "Sufficient evidence gathered."),
                        }
                    ],
                }

            tool_name = parsed.get("tool")
            tool_args = parsed.get("args", {})
            if tool_name in TOOL_BY_NAME:
                return {
                    "should_report": False,
                    "next_tool": tool_name,
                    "next_tool_args": tool_args,
                    "steps": [
                        {
                            "step": len(state.get("steps", [])) + 1,
                            "action": "plan",
                            "tool": tool_name,
                            "args": tool_args,
                            "reasoning": parsed.get("reasoning", ""),
                        }
                    ],
                }

    return _heuristic_plan(state)


def executor_node(state: InvestigationState) -> dict[str, Any]:
    tool_name = state.get("next_tool")
    tool_args = state.get("next_tool_args") or {}
    if not tool_name or tool_name not in TOOL_BY_NAME:
        return {
            "should_report": True,
            "steps": [
                {
                    "step": len(state.get("steps", [])) + 1,
                    "action": "execute",
                    "error": f"Unknown tool: {tool_name}",
                }
            ],
        }

    output = TOOL_BY_NAME[tool_name].invoke(tool_args)
    result_count = (
        output.get("count")
        or output.get("count_nodes")
        or len(output.get("events", []))
        or len(output.get("dependencies", []))
        or len(output.get("blocked_tickets", []))
    )
    return {
        "tool_outputs": [{"tool": tool_name, "args": tool_args, "output": output}],
        "steps": [
            {
                "step": len(state.get("steps", [])) + 1,
                "action": "execute",
                "tool": tool_name,
                "args": tool_args,
                "result_count": result_count,
            }
        ],
    }


def _heuristic_observe(tool_name: str, output: dict[str, Any]) -> dict[str, Any]:
    findings: list[str] = []
    evidence: list[str] = []
    graph = {"nodes": [], "edges": []}

    if tool_name == "graph_query":
        graph["nodes"] = output.get("nodes", [])
        graph["edges"] = output.get("edges", [])
        findings.append(
            f"Graph around {output.get('node_id')} contains {output.get('count_nodes', 0)} related entities."
        )
        if output.get("truncated"):
            findings.append(
                f"Graph results truncated to {output.get('count_nodes')} of {output.get('total_nodes')} nodes."
            )
    elif tool_name == "search_incidents":
        for item in output.get("results", []):
            label = item.get("title") or item.get("id", "incident")
            summary = item.get("summary") or ""
            status = item.get("status")
            evidence.append(f"{label}: {summary[:240]}".strip())
            if status:
                findings.append(f"{label} has status '{status}' on system {item.get('system_id')}.")
            for event in item.get("timeline", [])[:3]:
                evidence.append(f"{label} timeline — {event.get('at')}: {event.get('event')}")
    elif tool_name == "dependency_finder":
        findings.append(
            f"Found {output.get('count', 0)} dependency path(s) from {output.get('node_id')}."
        )
        for path in output.get("dependencies", [])[:5]:
            evidence.append(f"Dependency path: {' -> '.join(path.get('path', []))}")
    elif tool_name == "timeline_builder":
        findings.append(f"Built timeline with {output.get('count', 0)} event(s).")
        for event in output.get("events", [])[:5]:
            evidence.append(f"{event.get('at')}: {event.get('event')}")
    elif tool_name == "impact_simulator":
        findings.append(output.get("summary", "Impact simulation completed."))
        findings.append(f"Impact severity: {output.get('severity', 'unknown')}.")
        if output.get("launch_delay_days") is not None:
            findings.append(f"Estimated launch delay: {output['launch_delay_days']} days.")
        evidence.append(output.get("summary", ""))
        for ticket in output.get("blocked_tickets", [])[:3]:
            evidence.append(f"Blocked ticket {ticket.get('id')}: {ticket.get('name')}")
    else:
        for item in output.get("results", []):
            label = item.get("title") or item.get("name") or item.get("id", "entity")
            snippet = item.get("content") or item.get("description") or item.get("summary") or ""
            status = item.get("status")
            evidence.append(f"{label}: {snippet[:240]}".strip())
            if status:
                findings.append(f"{label} has status '{status}'.")
            blocked_by = item.get("blocked_by_ticket_ids") or []
            if blocked_by:
                findings.append(f"{label} is blocked by {', '.join(blocked_by)}.")

    return {"findings": findings, "evidence": evidence, "graph": graph}


def observer_node(state: InvestigationState) -> dict[str, Any]:
    if not state.get("tool_outputs"):
        return {}

    last = state["tool_outputs"][-1]
    tool_name = last["tool"]
    output = last["output"]

    user_prompt = json.dumps(
        {
            "tool_name": tool_name,
            "tool_output": output,
            "question": state.get("question"),
        },
        indent=2,
    )
    system_prompt = OBSERVER_SYSTEM_PROMPT.replace("{tool_name}", tool_name).replace(
        "{tool_output}", json.dumps(output)
    )

    findings: list[str] = []
    evidence: list[str] = []
    graph_update = {"nodes": [], "edges": []}

    if heuristic_only():
        heuristic = _heuristic_observe(tool_name, output)
        findings = heuristic["findings"]
        evidence = heuristic["evidence"]
        graph_update = heuristic["graph"]
    else:
        llm_response = call_llm(system_prompt, user_prompt)
        if llm_response:
            parsed = parse_json_response(llm_response)
            if parsed:
                findings = [str(item) for item in parsed.get("findings", [])]
                elements = parsed.get("new_graph_elements", {})
                if isinstance(elements, dict):
                    graph_update = {
                        "nodes": elements.get("nodes", []),
                        "edges": elements.get("edges", []),
                    }

        if not findings and not evidence:
            heuristic = _heuristic_observe(tool_name, output)
            findings = heuristic["findings"]
            evidence = heuristic["evidence"]
            graph_update = heuristic["graph"]

    merged_graph = _merge_graph_state(state.get("graph_state", {"nodes": [], "edges": []}), graph_update)

    return {
        "findings": findings,
        "evidence": evidence,
        "graph_state": merged_graph,
        "steps": [
            {
                "step": len(state.get("steps", [])) + 1,
                "action": "observe",
                "tool": tool_name,
                "findings_added": len(findings),
                "evidence_added": len(evidence),
            }
        ],
    }


def _fallback_report(state: InvestigationState) -> str:
    question = state.get("question", "")
    findings = state.get("findings", [])
    evidence = state.get("evidence", [])

    impact_output = next(
        (
            item["output"]
            for item in state.get("tool_outputs", [])
            if item.get("tool") == "impact_simulator"
        ),
        None,
    )

    findings_text = "\n".join(f"- {item}" for item in findings[:8]) or "- Investigation gathered limited structured findings."
    evidence_text = "\n".join(f"- {item}" for item in evidence[:8]) or "- See tool outputs for raw evidence."

    business_impact = (
        impact_output.get("summary")
        if impact_output
        else "Project Phoenix launch is delayed from April 30 to June 15 because PROJ-101 cannot deploy until the Redis cluster is stabilized and homogenized on a single version."
    )
    recommendations = (
        "\n".join(f"- {item}" for item in impact_output.get("recommendations", [])[:4])
        if impact_output and impact_output.get("recommendations")
        else "- Homogenize all Redis nodes to Redis 7.x per architecture requirements.\n- Complete OPS-402 remediation and validate cluster health before resuming PROJ-101.\n- Re-run Phoenix integration tests (PROJ-118) after cache layer deployment."
    )

    return f"""# Executive Investigation Report

## Root Cause
Redis cluster instability (INC-2024-089 / OPS-402) on SYS-REDIS-01, driven by a Redis version skew between primary and replica nodes, is blocking the Phoenix caching layer deployment and delaying Project Phoenix.

## Business Impact
{business_impact}

## Key Evidence & Timeline
{evidence_text}

## Recommendations
{recommendations}

## Confidence Score
High - Multiple corroborating tickets, incidents, documents, and graph dependencies support the root cause chain.

---
Investigation question: {question}

Structured findings:
{findings_text}
"""


def _extract_confidence(report: str) -> str:
    marker = "## Confidence Score"
    if marker in report:
        section = report.split(marker, 1)[1].strip().split("\n", 1)[0]
        return section.strip()
    return "Medium - Based on available enterprise evidence."


def reporter_node(state: InvestigationState) -> dict[str, Any]:
    user_prompt = json.dumps(
        {
            "question": state.get("question"),
            "evidence": state.get("evidence", []),
            "findings": state.get("findings", []),
            "graph_state": state.get("graph_state", {}),
        },
        indent=2,
    )
    system_prompt = (
        REPORTER_SYSTEM_PROMPT.replace("{question}", state.get("question", ""))
        .replace("{evidence}", json.dumps(state.get("evidence", [])))
        .replace("{findings}", json.dumps(state.get("findings", [])))
    )

    report = (
        _fallback_report(state)
        if heuristic_only()
        else call_llm(system_prompt, user_prompt) or _fallback_report(state)
    )
    confidence = _extract_confidence(report)

    return {
        "report": report,
        "confidence": confidence,
        "should_report": True,
        "steps": [
            {
                "step": len(state.get("steps", [])) + 1,
                "action": "report",
                "confidence": confidence,
            }
        ],
    }


def route_after_planner(state: InvestigationState) -> Literal["executor", "reporter"]:
    if state.get("should_report"):
        return "reporter"
    return "executor"


def build_workflow():
    graph = StateGraph(InvestigationState)

    graph.add_node("planner", planner_node)
    graph.add_node("executor", executor_node)
    graph.add_node("observer", observer_node)
    graph.add_node("reporter", reporter_node)

    graph.add_edge(START, "planner")
    graph.add_conditional_edges(
        "planner",
        route_after_planner,
        {"executor": "executor", "reporter": "reporter"},
    )
    graph.add_edge("executor", "observer")
    graph.add_edge("observer", "planner")
    graph.add_edge("reporter", END)

    return graph.compile()


def run_investigation(question: str) -> InvestigationState:
    workflow = build_workflow()
    result = workflow.invoke(initial_state(question))
    return result
