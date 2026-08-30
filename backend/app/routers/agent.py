from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AgentSettings, Conversation, ConversationMessage
from app.schemas.schemas import (
    AgentSettingsOut, AgentSettingsUpdate, AgentChatRequest, AgentChatResponse,
    ConversationOut, ConversationDetailOut, ChatMessage,
    SpeciesDraftRequest, SpeciesDraftOut,
)
from app.services.agent.agent import run_agent, draft_species
from app.services.agent.errors import AgentNotConfigured, AgentProviderError

router = APIRouter()

TITLE_MAX_LEN = 40


def get_or_create_agent_settings(db: Session) -> AgentSettings:
    settings = db.query(AgentSettings).filter_by(id="default").first()
    if not settings:
        settings = AgentSettings(id="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _to_out(settings: AgentSettings) -> AgentSettingsOut:
    return AgentSettingsOut(
        provider=settings.provider,
        model=settings.model,
        base_url=settings.base_url,
        api_key_set=bool(settings.api_key),
        updated_at=settings.updated_at,
    )


def _make_title(message: str) -> str:
    message = " ".join(message.split())
    return message if len(message) <= TITLE_MAX_LEN else message[:TITLE_MAX_LEN - 1].rstrip() + "…"


@router.get("/settings", response_model=AgentSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _to_out(get_or_create_agent_settings(db))


@router.put("/settings", response_model=AgentSettingsOut)
def update_settings(body: AgentSettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_agent_settings(db)
    data = body.model_dump(exclude_unset=True)
    if "api_key" in data:
        settings.api_key = data.pop("api_key") or None
    for k, v in data.items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return _to_out(settings)


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db)):
    return db.query(Conversation).order_by(Conversation.updated_at.desc()).all()


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter_by(id=conversation_id).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = db.query(Conversation).filter_by(id=conversation_id).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    db.delete(conversation)
    db.commit()


@router.post("/chat", response_model=AgentChatResponse)
def chat(body: AgentChatRequest, db: Session = Depends(get_db)):
    if body.conversation_id:
        conversation = db.query(Conversation).filter_by(id=body.conversation_id).first()
        if not conversation:
            raise HTTPException(404, "Conversation not found")
    else:
        conversation = Conversation(title=_make_title(body.message))
        db.add(conversation)
        db.flush()

    history = [ChatMessage(role=m.role, content=m.content) for m in conversation.messages]
    history.append(ChatMessage(role="user", content=body.message))

    try:
        reply = run_agent(db, history)
    except AgentNotConfigured as e:
        db.rollback()
        raise HTTPException(400, str(e))
    except AgentProviderError as e:
        db.rollback()
        raise HTTPException(502, str(e))

    db.add(ConversationMessage(conversation_id=conversation.id, role="user", content=body.message))
    db.add(ConversationMessage(conversation_id=conversation.id, role="assistant", content=reply))
    conversation.updated_at = datetime.utcnow()
    db.commit()

    return AgentChatResponse(conversation_id=conversation.id, reply=reply)


@router.post("/species-draft", response_model=SpeciesDraftOut)
def species_draft(body: SpeciesDraftRequest, db: Session = Depends(get_db)):
    try:
        raw = draft_species(db, body.name)
        return SpeciesDraftOut.model_validate(raw)
    except AgentNotConfigured as e:
        raise HTTPException(400, str(e))
    except AgentProviderError as e:
        raise HTTPException(502, str(e))
    except ValidationError:
        raise HTTPException(502, "The AI's draft didn't come back in the right shape — try again.")
