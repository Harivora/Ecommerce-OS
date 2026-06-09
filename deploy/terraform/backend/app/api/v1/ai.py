"""AI analyst: conversation CRUD + grounded chat via Claude."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.crypto import decrypt_credentials, encrypt_credentials
from app.core.database import get_db
from app.core.deps import AuthContext, get_auth_context, require_editor, require_org
from app.models.ai import AIConversation, AIMessage
from app.models.enums import ConnectionStatus, IntegrationCategory, MessageRole
from app.models.integration import Integration
from app.schemas.ai import (
    ChatConversationOut,
    ChatConversationSummary,
    ChatMessageOut,
    ChatRequest,
    ChatResponse,
)
from app.schemas.common import CamelModel, Message
from app.services import ai_analyst

router = APIRouter()

HISTORY_LIMIT = 20
AI_PROVIDER = "anthropic"


class AIConfigOut(CamelModel):
    configured: bool
    source: str | None = None  # "org" | "env" | None
    model: str


class AIConfigIn(CamelModel):
    api_key: str


async def _org_anthropic_row(db: AsyncSession, org_id: str) -> Integration | None:
    return await db.scalar(
        select(Integration).where(
            Integration.organization_id == org_id,
            Integration.provider == AI_PROVIDER,
        )
    )


async def resolve_anthropic_key(db: AsyncSession, org_id: str) -> str | None:
    """Per-org key (preferred) then the global env key."""
    row = await _org_anthropic_row(db, org_id)
    if row and row.credentials_encrypted:
        try:
            creds = decrypt_credentials(row.credentials_encrypted)
            if creds.get("api_key"):
                return creds["api_key"]
        except Exception:  # corrupt blob → fall through to env
            pass
    return settings.anthropic_api_key or None


@router.get("/config", response_model=AIConfigOut)
async def get_ai_config(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> AIConfigOut:
    row = await _org_anthropic_row(db, org_id)
    if row and row.credentials_encrypted:
        return AIConfigOut(configured=True, source="org", model=settings.anthropic_model)
    if settings.anthropic_api_key:
        return AIConfigOut(configured=True, source="env", model=settings.anthropic_model)
    return AIConfigOut(configured=False, source=None, model=settings.anthropic_model)


@router.put("/config", response_model=AIConfigOut)
async def set_ai_config(
    payload: AIConfigIn,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> AIConfigOut:
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "API key cannot be empty.")
    row = await _org_anthropic_row(db, org_id)
    if row is None:
        row = Integration(
            organization_id=org_id,
            provider=AI_PROVIDER,
            name="Anthropic",
            category=IntegrationCategory.ai,
        )
        db.add(row)
    row.credentials_encrypted = encrypt_credentials({"api_key": key})
    row.status = ConnectionStatus.connected
    await db.flush()
    return AIConfigOut(configured=True, source="org", model=settings.anthropic_model)


@router.delete("/config", response_model=AIConfigOut)
async def clear_ai_config(
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> AIConfigOut:
    row = await _org_anthropic_row(db, org_id)
    if row is not None:
        await db.delete(row)
        await db.flush()
    if settings.anthropic_api_key:
        return AIConfigOut(configured=True, source="env", model=settings.anthropic_model)
    return AIConfigOut(configured=False, source=None, model=settings.anthropic_model)


def _msg_out(m: AIMessage) -> ChatMessageOut:
    return ChatMessageOut(
        id=m.id, role=m.role, content=m.content, timestamp=m.created_at.isoformat()
    )


def _conv_out(c: AIConversation) -> ChatConversationOut:
    return ChatConversationOut(
        id=c.id,
        title=c.title,
        messages=[_msg_out(m) for m in c.messages],
        created_at=c.created_at.isoformat(),
        updated_at=c.updated_at.isoformat(),
    )


@router.get("/conversations", response_model=list[ChatConversationSummary])
async def list_conversations(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[ChatConversationSummary]:
    rows = (
        await db.scalars(
            select(AIConversation)
            .where(AIConversation.organization_id == org_id)
            .order_by(AIConversation.updated_at.desc())
        )
    ).all()
    return [
        ChatConversationSummary(
            id=c.id, title=c.title,
            created_at=c.created_at.isoformat(), updated_at=c.updated_at.isoformat(),
        )
        for c in rows
    ]


@router.get("/conversations/{conversation_id}", response_model=ChatConversationOut)
async def get_conversation(
    conversation_id: str,
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> ChatConversationOut:
    conv = await _load_conversation(db, conversation_id, org_id)
    return _conv_out(conv)


@router.delete("/conversations/{conversation_id}", response_model=Message)
async def delete_conversation(
    conversation_id: str,
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> Message:
    conv = await _load_conversation(db, conversation_id, org_id)
    await db.delete(conv)
    return Message(detail="Conversation deleted.")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    ctx: AuthContext = Depends(get_auth_context),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    # Resolve or create the conversation, capturing prior messages first.
    if payload.conversation_id:
        conv = await _load_conversation(db, payload.conversation_id, org_id)
        prior = list(conv.messages)  # eagerly loaded in _load_conversation
    else:
        title = payload.message.strip()[:60] or "New Analysis Session"
        conv = AIConversation(organization_id=org_id, user_id=ctx.user.id, title=title)
        db.add(conv)
        await db.flush()
        prior = []

    # Persist the user's message.
    db.add(
        AIMessage(conversation_id=conv.id, role=MessageRole.user, content=payload.message)
    )
    await db.flush()

    # Build prior history (oldest first, capped) for the model.
    history = [
        {"role": m.role.value, "content": m.content}
        for m in prior[-HISTORY_LIMIT:]
        if m.role in (MessageRole.user, MessageRole.assistant)
    ]
    context = await ai_analyst.build_org_context(db, org_id)
    api_key = await resolve_anthropic_key(db, org_id)
    reply_text, tokens = await ai_analyst.generate_reply(
        context, history, payload.message, api_key=api_key
    )

    assistant_msg = AIMessage(
        conversation_id=conv.id,
        role=MessageRole.assistant,
        content=reply_text,
        tokens=tokens,
    )
    db.add(assistant_msg)
    await db.flush()
    await db.refresh(assistant_msg)

    return ChatResponse(conversation_id=conv.id, reply=_msg_out(assistant_msg))


async def _load_conversation(
    db: AsyncSession, conversation_id: str, org_id: str
) -> AIConversation:
    conv = await db.scalar(
        select(AIConversation)
        .where(
            AIConversation.id == conversation_id,
            AIConversation.organization_id == org_id,
        )
        .options(selectinload(AIConversation.messages))
    )
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return conv
