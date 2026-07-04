from __future__ import annotations

from langchain_core.tools import StructuredTool

from app.tools.dependency_finder import DependencyFinderInput, dependency_finder
from app.tools.graph_query import GraphQueryInput, graph_query
from app.tools.impact_simulator import ImpactSimulatorInput, impact_simulator
from app.tools.search_documents import SearchDocumentsInput, search_documents
from app.tools.search_incidents import SearchIncidentsInput, search_incidents
from app.tools.search_projects import SearchProjectsInput, search_projects
from app.tools.search_tickets import SearchTicketsInput, search_tickets
from app.tools.timeline_builder import TimelineBuilderInput, timeline_builder

search_documents_tool = StructuredTool.from_function(
    func=search_documents,
    name="search_documents",
    description="Search documents by substring match on title and content.",
    args_schema=SearchDocumentsInput,
)

search_tickets_tool = StructuredTool.from_function(
    func=search_tickets,
    name="search_tickets",
    description="Search tickets by title substring and/or filter by project_id.",
    args_schema=SearchTicketsInput,
)

search_incidents_tool = StructuredTool.from_function(
    func=search_incidents,
    name="search_incidents",
    description="Filter incidents by status and/or system_id. Returns incident timelines.",
    args_schema=SearchIncidentsInput,
)

search_projects_tool = StructuredTool.from_function(
    func=search_projects,
    name="search_projects",
    description="Search projects by substring match on name or id.",
    args_schema=SearchProjectsInput,
)

graph_query_tool = StructuredTool.from_function(
    func=graph_query,
    name="graph_query",
    description="Query the enterprise knowledge graph from a node id and return a summarized subgraph.",
    args_schema=GraphQueryInput,
)

dependency_finder_tool = StructuredTool.from_function(
    func=dependency_finder,
    name="dependency_finder",
    description="Find dependency and blocker paths from a node across depends_on, blocked_by, and affects edges.",
    args_schema=DependencyFinderInput,
)

timeline_builder_tool = StructuredTool.from_function(
    func=timeline_builder,
    name="timeline_builder",
    description="Build a chronological timeline of tickets, incidents, and project milestones.",
    args_schema=TimelineBuilderInput,
)

impact_simulator_tool = StructuredTool.from_function(
    func=impact_simulator,
    name="impact_simulator",
    description="Simulate downstream business impact for a project using dependency and incident data.",
    args_schema=ImpactSimulatorInput,
)

ALL_TOOLS = [
    search_documents_tool,
    search_tickets_tool,
    search_incidents_tool,
    search_projects_tool,
    graph_query_tool,
    dependency_finder_tool,
    timeline_builder_tool,
    impact_simulator_tool,
]

TOOL_BY_NAME = {tool.name: tool for tool in ALL_TOOLS}
