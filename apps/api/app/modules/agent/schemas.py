"""D-11: AI Agent - schemas."""

from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    """Agent chat request."""

    message: str = Field(..., min_length=1, max_length=4000)
    source: str = Field(default="arxiv", description="search source")
    search_limit: int = Field(default=8, ge=1, le=20)
    attach_top_k: int = Field(default=5, ge=1, le=10)
    context_project_id: str | None = None
    context_papers: list["AgentPaperContext"] = Field(default_factory=list)


class AgentPaperContext(BaseModel):
    """Paper context from previous turns."""

    paper_id: str
    title: str = ""
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    venue: str = ""


class AgentAction(BaseModel):
    """Action trace for UI."""

    step: str
    status: str = "completed"
    detail: str


class AgentProject(BaseModel):
    """Created/target project summary."""

    id: str
    title: str


class AgentPaper(BaseModel):
    """Paper summary returned by agent."""

    paper_id: str
    title: str
    authors: list[str]
    year: int | None = None
    venue: str = ""


class AgentChatResponse(BaseModel):
    """Agent chat response."""

    reply: str
    actions: list[AgentAction] = Field(default_factory=list)
    project: AgentProject | None = None
    papers: list[AgentPaper] = Field(default_factory=list)
