# Masmo — Architecture Documentation

**Project:** Masmo  
**Hackathon:** RAISE Summit Hackathon 2026  
**Track:** Vultr  
**Bonus Integrations:** Gradium + OpenRouter + Cloudflare

---

# 1. System Overview

Masmo is an event-driven AI investigation system built around a multi-step agent runtime.

It combines:

- Agent orchestration (LangGraph)
- Knowledge graph reasoning (NetworkX)
- Tool-based execution
- Multi-model LLM routing (Vultr + OpenRouter)
- Voice interface (Gradium)

---

# 2. High-Level Architecture

```
Frontend (React + Cloudflare Pages)
        │
        ▼
FastAPI Backend
        │
        ▼
LangGraph Agent Runtime
        │
        ├──────────────┬───────────────┬──────────────┐
        ▼              ▼               ▼              ▼
Planner        Tool Registry     State Manager   LLM Router
                                                     │
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                      Vultr API          OpenRouter API
```

---

# 3. Core Components

## Frontend

- React
- Tailwind
- React Flow (Graph UI)
- Timeline Viewer
- Evidence Panel
- Investigation Dashboard

Deployed via:
- Cloudflare Pages (bonus track)

---

## Backend

- FastAPI
- LangGraph
- NetworkX
- SQLite / JSON mock DB
- LiteLLM (multi-provider routing)

---

# 4. Agent Runtime

Masmo uses a stateful agent system.

Flow:

```
User Query
   ↓
Planner Agent
   ↓
Tool Selection
   ↓
Execution
   ↓
Observation
   ↓
Next Decision
   ↓
Repeat
   ↓
Report Generation
```

---

# 5. LLM Router (NEW)

Masmo supports multiple model providers.

```
                LLM Router
                    │
     ┌──────────────┴──────────────┐
     ▼                             ▼
 Vultr (Primary)          OpenRouter (Fallback)
```

Benefits:

- Reliability
- Flexibility
- Bonus prize eligibility
- Easier model switching

---

# 6. Tool System

Each tool is isolated and stateless.

## Tools

- search_documents
- search_tickets
- search_incidents
- search_projects
- graph_query
- dependency_finder
- timeline_builder
- impact_simulator
- report_generator

Each tool returns structured JSON.

---

# 7. Knowledge Graph

Built using NetworkX.

Nodes:

- Employees
- Projects
- Incidents
- Tickets
- Documents
- Vendors
- Services

Edges:

- depends_on
- blocked_by
- owns
- affects
- documented_in

---

# 8. Investigation State

```
question
steps[]
tool_outputs[]
evidence[]
graph
findings[]
confidence
report
```

State is passed through every step of the agent.

---

# 9. Gradium Voice Layer

## Input (STT)
User speaks → transcript → agent

## Output (TTS)
Report → spoken executive summary

## Feature

🎙 Executive Briefing Mode

Masmo reads final report aloud.

---

# 10. Cloudflare Integration

Frontend deployed on:

- Cloudflare Pages

Optional:

- Edge caching
- Fast global delivery

---

# 11. API Structure

## POST /investigate
Start investigation

## GET /investigation/{id}
Live progress

## GET /graph/{id}
Graph state

## GET /report/{id}
Final report

---

# 12. Event-Driven Design (Important)

Each action emits events:

```
tool_started
tool_completed
evidence_found
graph_updated
report_generated
```

Frontend subscribes to these for live updates.

---

# 13. Folder Structure

## Backend

```
app/
  agents/
  tools/
  graph/
  api/
  services/
  data/
  core/
```

## Frontend

```
src/
  pages/
  components/
  graph/
  timeline/
  evidence/
  services/
```

---

# 14. Deployment Architecture

```
Cloudflare Pages → Frontend

FastAPI → Backend

Vultr / OpenRouter → LLMs

Gradium → Voice Layer
```

---

# 15. Design Principles

- Agent-first architecture
- Tool isolation
- Explainable reasoning
- Event-driven UI updates
- Multi-model resilience
- Enterprise realism

---

# 16. Key Innovation

Masmo combines:

- Graph reasoning
- Multi-step agent workflows
- Business impact simulation
- Voice-driven executive reporting
- Multi-provider AI routing

to simulate an **AI operations analyst inside an enterprise system**.