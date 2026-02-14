from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class AgentContext(BaseModel):
    project_id: str | None = None
    paper_id: str | None = None


class AgentAction(BaseModel):
    action: str
    params: dict[str, Any] = Field(default_factory=dict)


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[AgentMessage] = Field(default_factory=list)
    execute: bool = True
    context: AgentContext = Field(default_factory=AgentContext)
    actions_override: list[AgentAction] | None = None


class AgentPlan(BaseModel):
    summary: str
    plan: list[str] = Field(default_factory=list)
    actions: list[AgentAction] = Field(default_factory=list)


class AgentStepResult(BaseModel):
    action: str
    status: Literal["completed", "failed", "skipped"]
    detail: str
    output: dict[str, Any] | None = None
    error: str | None = None


class AgentVerification(BaseModel):
    verdict: Literal["met", "partial", "not_met", "not_executed"] = "partial"
    summary: str = ""
    achieved: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)


class AgentChatResponse(BaseModel):
    reply: str
    used_function_doc: bool = True
    plan: list[str]
    actions: list[AgentAction] = Field(default_factory=list)
    steps: list[AgentStepResult]
    artifacts: dict[str, Any] = Field(default_factory=dict)
    target_path: str | None = None
    verification: AgentVerification | None = None
    pending_actions: list[AgentAction] = Field(default_factory=list)
    pending_plan: list[str] = Field(default_factory=list)
