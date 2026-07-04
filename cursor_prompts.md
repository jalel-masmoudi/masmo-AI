# Cursor Implementation Prompts: Masmo Initialization

Hello Cursor, please follow these prompts sequentially to set up the Masmo application. Do not proceed to the next prompt until you have successfully completed the current one.

## Prompt 1: Project Initialization & Folder Structure

**Objective:** Set up the fundamental project architecture for both the FastAPI backend and the React frontend.

**Instructions for Cursor:**
1.  **Initialize the Backend:**
    *   Create a `backend` folder.
    *   Initialize a Python virtual environment inside `backend`.
    *   Create a `requirements.txt` with the following initial dependencies: `fastapi`, `uvicorn`, `langgraph`, `networkx`, `litellm`, `pydantic`.
    *   Create the backend folder structure as defined in `Architecture.md`:
        ```
        backend/
          app/
            agents/
            tools/
            graph/
            api/
            services/
            data/
            core/
        ```
2.  **Initialize the Frontend:**
    *   Create a `frontend` folder at the root.
    *   Initialize a new React project using Vite (with TypeScript): `npm create vite@latest frontend -- --template react-ts`.
    *   Install Tailwind CSS and configure it according to the official Tailwind Vite guide.
    *   Install `reactflow` and `react-router-dom`.
    *   Create the frontend folder structure as defined in `Architecture.md`:
        ```
        frontend/
          src/
            pages/
            components/
            graph/
            timeline/
            evidence/
            services/
        ```
3.  **Confirm completion:** Once you have created these directories and installed the base dependencies, let me know. Do not write any functional code yet.

---

## Prompt 2: Mock Enterprise Data Layer

**Objective:** Create the mock data that our agents will investigate.

**Instructions for Cursor:**
1.  Navigate to `backend/app/data/`.
2.  Create a file named `mock_db.json`.
3.  Populate this JSON file with a realistic, interconnected mock enterprise dataset that supports the "Project Phoenix delayed" use case. It must include:
    *   **Employees:** Define key roles (e.g., Sarah the PM, David the Lead DevOps, Alex the DB Admin).
    *   **Projects:** Define "Project Phoenix" and its dependencies.
    *   **Tickets:** Create Jira-style tickets (e.g., "PROJ-101: Deploy new caching layer", "OPS-402: Redis cluster instability").
    *   **Incidents:** Create a PagerDuty-style incident relating to the Redis cluster.
    *   **Documents:** Create Confluence-style snippets detailing architectural decisions (e.g., "Project Phoenix requires Redis v7").
4.  Ensure there are clear linking IDs (e.g., ticket OPS-402 references employee David; Project Phoenix depends on the Redis cluster).
5.  Create a simple Python loader in `backend/app/services/data_loader.py` that reads this JSON and exposes it as dictionaries.
6.  **Confirm completion:** Show me a snippet of the JSON schema you created.

---

## Prompt 3: Knowledge Graph Initialization

**Objective:** Implement the NetworkX graph that will hold our enterprise data.

**Instructions for Cursor:**
1.  Navigate to `backend/app/graph/`.
2.  Create `enterprise_graph.py`.
3.  Implement a class `EnterpriseGraph` that initializes a `networkx.MultiDiGraph`.
4.  Write methods to:
    *   `add_node(node_id, node_type, properties)`
    *   `add_edge(source_id, target_id, relation_type)`
    *   `build_from_mock_data(mock_data)`: A method that iterates over the data loaded in Prompt 2 and populates the graph.
        *   Example nodes: `employee_david`, `ticket_OPS-402`, `project_phoenix`.
        *   Example edges: `employee_david` --[owns]--> `ticket_OPS-402`, `project_phoenix` --[blocked_by]--> `ticket_OPS-402`.
5.  Write a method `get_subgraph(start_node_id, max_depth)` to retrieve a specific area of the graph.
6.  **Confirm completion:** Confirm the graph builds successfully using the mock data.

---

## Prompt 4: Tool Registry Setup

**Objective:** Define the isolated tools the LangGraph agent will use.

**Instructions for Cursor:**
1.  Navigate to `backend/app/tools/`.
2.  Create Python files for the core tools defined in `Architecture.md` (these can be dummy implementations for now that just query the `EnterpriseGraph` or the raw mock data):
    *   `search_documents.py`
    *   `search_tickets.py`
    *   `search_incidents.py`
    *   `search_projects.py`
    *   `graph_query.py` (queries the NetworkX graph)
3.  Ensure every tool uses Pydantic for input validation and returns a structured JSON response.
4.  Create a `registry.py` that exports a list of all available tools so the LangGraph agent can bind them.
5.  **Confirm completion:** List the tools you have registered.

---

## Prompt 5: State Management & LangGraph Setup

**Objective:** Define the agent's state and the LangGraph workflow.

**Instructions for Cursor:**
1.  Navigate to `backend/app/agents/`.
2.  Create `state.py` and define the `InvestigationState` TypedDict as specified in `Architecture.md` (question, steps, tool_outputs, evidence, graph_state, findings, confidence, report).
3.  Create `workflow.py`. Initialize the `StateGraph`.
4.  Define the core nodes:
    *   `planner`: Determines the next tool to call based on the current state.
    *   `executor`: Executes the tool.
    *   `observer`: Updates the state (evidence, graph) based on tool output.
    *   `reporter`: Generates the final executive summary.
5.  Set up the routing logic (conditional edges) to loop between `planner`, `executor`, and `observer` until the planner decides enough evidence is gathered, then route to `reporter`.
6.  For the LLM calls within these nodes, use `litellm` configured to use Vultr as the primary provider and OpenRouter as the fallback (as per `Architecture.md`). Use a placeholder model string for now if you don't have API keys.
7.  **Confirm completion:** Provide a visual summary or text description of the compiled graph structure.

---

## Prompt 6: FastAPI Endpoints

**Objective:** Expose the agent via a REST API.

**Instructions for Cursor:**
1.  Navigate to `backend/app/api/`.
2.  Create `routes.py`.
3.  Implement the following endpoints (as per `Architecture.md`):
    *   `POST /investigate`: Accepts a query, starts the LangGraph workflow asynchronously, and returns an `investigation_id`.
    *   `GET /investigation/{id}`: Returns the current state/progress of the investigation.
    *   `GET /graph/{id}`: Returns the current state of the knowledge graph for this investigation.
    *   `GET /report/{id}`: Returns the final report once complete.
4.  Wire these up to the main FastAPI app in `backend/app/main.py`.
5.  **Confirm completion:** Verify the FastAPI server runs without errors.

---

## Prompt 7: Frontend Foundation & Investigation Dashboard

**Objective:** Build the UI to interact with the API.

**Instructions for Cursor:**
1.  Navigate to the React `frontend`.
2.  Create an aesthetic, enterprise-grade dark-mode layout using Tailwind.
3.  Build the `InvestigationDashboard` component.
4.  Add an input field for the user query (e.g., "Why is Project Phoenix delayed?").
5.  Implement API polling or Server-Sent Events (SSE) to listen to backend updates for a specific `investigation_id`.
6.  As updates come in, populate:
    *   A `TimelineViewer` component showing the agent's reasoning steps.
    *   An `EvidencePanel` showing snippets of the retrieved documents/tickets.
7.  **Confirm completion:** Ensure the UI correctly displays mock state updates from the backend.

---

## Prompt 8: React Flow Graph UI

**Objective:** Visualize the enterprise dependencies.

**Instructions for Cursor:**
1.  In the `frontend`, create a `GraphViewer` component using `reactflow`.
2.  Fetch data from `GET /graph/{id}`.
3.  Map the backend NetworkX node/edge structure to `reactflow` nodes and edges.
4.  Style the nodes based on their type (e.g., Employees are circles, Tickets are squares; color code Incidents as red, Projects as blue).
5.  Ensure the graph layout is readable.
6.  **Confirm completion:** Ensure the graph renders correctly alongside the timeline.

---

## Prompt 9: Executive Report & Gradium UI Hook

**Objective:** Present the final conclusion.

**Instructions for Cursor:**
1.  Create an `ExecutiveReport` component in the frontend.
2.  When the investigation state indicates completion, display the structured summary (Root Cause, Impact, Recommendations).
3.  Add a UI button: 🎙 "Play Executive Briefing".
4.  (Placeholder for Gradium): For now, clicking this button should log an event or use basic browser Text-to-Speech to read the report aloud. The actual Gradium API integration will be wired up later.
5.  **Confirm completion:** Test the full flow from query input to final report display.
