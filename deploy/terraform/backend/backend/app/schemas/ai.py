from __future__ import annotations

from app.models.enums import MessageRole
from app.schemas.common import CamelModel


class ChatMessageOut(CamelModel):
    id: str
    role: MessageRole
    content: str
    timestamp: str


class ChatConversationOut(CamelModel):
    id: str
    title: str
    messages: list[ChatMessageOut] = []
    created_at: str
    updated_at: str


class ChatConversationSummary(CamelModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class ChatRequest(CamelModel):
    conversation_id: str | None = None
    message: str


class ChatResponse(CamelModel):
    conversation_id: str
    reply: ChatMessageOut
