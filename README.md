# Masmo — Enterprise Investigation Agent

**Hackathon:** RAISE Summit Hackathon 2026  
**Track:** Vultr (Enterprise Agent)  
**Bonus Integrations:** Gradium, OpenRouter, Cloudflare

Masmo is an **AI-native Enterprise Investigation Agent** that transforms fragmented enterprise data (tickets, documents, incidents, system states) into a living organizational intelligence graph. 

It does not just answer questions like a chatbot. Masmo behaves like a Senior Operations Analyst: it plans a multi-step investigation, queries various data silos, builds a dependency graph, determines root causes, and generates an executive report—delivered both visually and via voice.

---

## 🌟 The Core Problem

When a major enterprise initiative is delayed or a system goes down, finding the root cause requires human analysts to manually connect dots across Jira, Slack, PagerDuty, and Confluence. 

Current AI tools (like standard RAG chatbots) fail here because they answer questions directly based on simple semantic search. They do not **investigate**, **reason across multiple steps**, or **understand the topological dependencies** of an enterprise.

## 🚀 The Masmo Solution

Masmo introduces an event-driven **Investigation Agent Workflow**:

1. **Plan:** The agent breaks down the user's question into logical steps.
2. **Execute:** It dynamically selects specialized tools to query different mocked enterprise systems (`search_tickets`, `search_incidents`, `search_projects`, `search_documents`).
3. **Observe:** It extracts evidence and updates a real-time **NetworkX Knowledge Graph**.
4. **Report:** It synthesizes the topological dependencies and evidence into an Executive Briefing.
5. **Vocalize:** Using Gradium TTS, it reads the final summary aloud for an eyes-free executive experience.

### Example Use Case
**User:** *"Why is Project Phoenix delayed?"*

**Masmo:**
1. Finds Project Phoenix is blocked by Jira Ticket `PROJ-101`.
2. Finds `PROJ-101` requires a new `SYS-REDIS-01` deployment.
3. Finds `SYS-REDIS-01` is currently degraded due to PagerDuty Incident `INC-9921` (Memory Leak).
4. Finds a Confluence document stating Project Phoenix *strictly* requires this Redis version.
5. **Conclusion:** Project Phoenix is delayed due to an active memory leak on a critical database dependency. 

---

## 🏗️ Technical Architecture

### 1. Agent Runtime & Reasoning
- **Framework:** LangGraph (Stateful, cyclic multi-agent graph).
- **Core Nodes:** Planner, Executor, Observer, Reporter.
- **Inference Routing:** LiteLLM routes primary inference to **Vultr API**, with fallback routing to **OpenRouter** ensuring enterprise-grade reliability and zero downtime during demonstrations.

### 2. Knowledge Graph Layer
- **Engine:** NetworkX (Python).
- Masmo actively builds a `MultiDiGraph` as it investigates, tracking nodes (Employees, Projects, Incidents) and edges (`blocked_by`, `depends_on`, `owns`).

### 3. Voice Integration (Gradium)
- The final executive report is processed via Gradium’s Text-to-Speech engine, creating an "Executive Briefing Mode" allowing leaders to simply listen to the root-cause analysis.

### 4. Stack
- **Backend:** FastAPI, Python, LangGraph, NetworkX, LiteLLM.
- **Frontend:** React, Vite, Tailwind CSS, React Flow (for graph visualization).
- **Deployment:** Cloudflare Pages (Frontend).

---

## ⚙️ How to Run Locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # add API keys as needed
uvicorn app.main:app --reload --port 8000
```

Or on Windows: `.\scripts\dev_backend.ps1`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Or on Windows: `.\scripts\dev_frontend.ps1`

Open `http://localhost:5173`, enter a question such as *"Why is Project Phoenix delayed?"*, and click **Investigate**.

> **Tip:** If LLM keys are missing or invalid, set `MASMO_HEURISTIC_ONLY=1` in `backend/.env` for fast deterministic investigations (used automatically by the e2e test).

### End-to-end verification
```bash
# From repo root (Windows)
.\scripts\run_e2e.ps1

# Or manually
cd backend
$env:MASMO_HEURISTIC_ONLY="1"
.\venv\Scripts\python ..\scripts\e2e_test.py
```

From frontend: `npm run test:e2e`

### Deploy Frontend (Cloudflare Pages)

The frontend ships with Cloudflare Pages config:

| File | Purpose |
|------|---------|
| `frontend/wrangler.toml` | Pages project name, build output, `BACKEND_API_URL` binding |
| `frontend/public/_redirects` | SPA fallback (`/* → index.html`) |
| `frontend/public/_headers` | Edge cache for hashed assets + security headers |
| `frontend/public/_routes.json` | Skip middleware on static assets |
| `frontend/functions/_middleware.ts` | API proxy to backend + edge cache for `/health` |

**Option A — Git-connected Pages (recommended)**

1. In Cloudflare Dashboard → Pages → Create project → Connect to Git
2. **Root directory:** `frontend`
3. **Build command:** `npm run build`
4. **Build output directory:** `dist`
5. **Build environment variables:**
   - `VITE_API_BASE_URL` = *(leave empty to use same-origin edge proxy)*
6. **Runtime variables** (Settings → Environment variables):
   - `BACKEND_API_URL` = your public FastAPI URL (e.g. `https://api.masmo.example.com`)
7. Add your Pages URL to `CORS_ORIGINS` in the backend `.env` (only needed if calling the API directly via `VITE_API_BASE_URL`).

**Option B — Wrangler CLI**

```bash
cd frontend
cp .env.production.example .env.production
# Edit wrangler.toml [env.production.vars] BACKEND_API_URL
npm install
npm run deploy:pages
```

**Edge caching behavior**

- Static JS/CSS (`/assets/*`): cached 1 year at the edge (`immutable`)
- `index.html`: always revalidated
- `GET /health`: cached 60s at the edge via Pages middleware
- Investigation polling (`/investigation/*`, etc.): `no-store` — never edge-cached

---

## 🏆 Why Masmo wins the Vultr Track

1. **Multi-Step Reasoning:** We go beyond single-shot LLM calls. Masmo exhibits true agentic planning and tool use over multiple state iterations.
2. **High-Performance Inference:** Powered by Vultr's robust AI endpoints, allowing for rapid loop execution in LangGraph.
3. **Real Enterprise Value:** Solves a tangible, high-value problem (incident investigation and root cause analysis) rather than a toy use case.
4. **Explainability:** Every conclusion is grounded in strict evidence and visualized topologically in the UI.
