# Masmo Tool Logic & Graph Schema Definitions

Cursor, to ensure the backend LangGraph agent functions correctly with the mock data, please follow these exact specifications for the Tool logic and Graph schema.

## 1. Graph Schema (NetworkX)

The `EnterpriseGraph` should support the following node types and edge relations.

### Node Types
- **Employee**: Attributes: `id`, `name`, `role`, `department`
- **Project**: Attributes: `id`, `name`, `status`
- **Ticket**: Attributes: `id`, `title`, `type`, `status`
- **Incident**: Attributes: `id`, `title`, `severity`, `status`
- **Document**: Attributes: `id`, `title`
- **System**: Attributes: `id`, `name`, `status`

### Edge Types (Relations)
- `owns`: Employee -> Project | Employee -> Ticket
- `depends_on`: Project -> System | System -> System
- `blocked_by`: Ticket -> Ticket | Project -> Ticket
- `affects`: Incident -> System
- `assigned_to`: Ticket -> Employee | Incident -> Employee
- `documented_in`: Project -> Document | System -> Document

*Implementation Note for Cursor:* When building `get_subgraph`, ensure it traverses directed edges in both directions so that querying a Project also returns the Employees who own it and the Systems it depends on.

---

## 2. Tool Logic Definitions

Each tool exposed to the agent must have strict Pydantic schemas.

### A. `search_projects(query: str)`
- **Logic:** Searches the mock DB `projects` list for substring matches in `name` or `id`.
- **Returns:** A list of matching project dictionaries.
- **Example Use:** Finding the current status and dependencies of "Project Phoenix".

### B. `search_tickets(query: str, project_id: Optional[str] = None)`
- **Logic:** Searches the mock DB `tickets` list for substring matches in `title`, or filters by `project_id`.
- **Returns:** A list of ticket dictionaries.
- **Example Use:** Finding all blocked tickets related to PRJ-PHX.

### C. `search_incidents(status: Optional[str] = None, system_id: Optional[str] = None)`
- **Logic:** Filters active incidents. Crucial for finding root causes of system degradation.
- **Returns:** Incident dictionaries, including their timeline.
- **Example Use:** Finding why `SYS-REDIS-01` is degraded.

### D. `search_documents(query: str)`
- **Logic:** Substring search across document `title` and `content`.
- **Returns:** Matching documents.
- **Example Use:** Finding architectural decisions or post-mortem drafts.

### E. `graph_query(node_id: str, depth: int = 2)`
- **Logic:** Queries the `EnterpriseGraph` starting at `node_id` and traverses up to `depth` edges.
- **Returns:** A JSON representation of the subgraph (nodes and edges).
- **Example Use:** The agent uses this to discover that `PRJ-PHX` depends on `SYS-REDIS-01`, which is affected by `INC-9921`.

---

## 3. Tool Output Formatting

To prevent overwhelming the LLM's context window, all tools must return **summarized JSON**, not massive data dumps. 

For example, if `graph_query` returns 50 nodes, the tool should truncate or summarize the most relevant connected nodes. The Observer node will parse this JSON and append only the critical findings to the `InvestigationState`.
