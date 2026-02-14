"""D-11: AI Agent - router."""

from fastapi import APIRouter, Depends

from app.core.firebase_auth import get_current_user
from app.modules.agent.schemas import AgentChatRequest, AgentChatResponse
from app.modules.agent.service import agent_service

router = APIRouter()


@router.post("/agent/chat", response_model=AgentChatResponse)
async def agent_chat(
    body: AgentChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run agent workflow from a user message."""
    return await agent_service.handle_chat(current_user["uid"], body)

