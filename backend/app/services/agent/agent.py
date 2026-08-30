import json
from sqlalchemy.orm import Session

from app.models.models import AgentSettings
from app.schemas.schemas import ChatMessage
from app.services.agent.errors import AgentNotConfigured
from app.services.agent.tools import TOOL_SCHEMAS, execute_tool
from app.services.agent.providers.openai_compatible import OpenAICompatibleProvider
from app.services.agent.providers.anthropic_provider import AnthropicProvider

MAX_ITERATIONS = 6

SYSTEM_PROMPT = (
    "You are the TankBook Assistant, a diagnostic aquarium-keeping assistant built into a self-hosted "
    "aquarium management app. You have read-only tools to look up the user's tanks, water parameter "
    "history, alerts, journal entries, maintenance tasks, tap water tests, and the species reference "
    "catalogue. Always use these tools to ground your answers in the user's actual data rather than "
    "guessing — for example, look up recent water parameters before diagnosing a water quality issue, "
    "and check journal entries and alerts before commenting on a tank's history. You cannot create, "
    "modify, or delete any data. Be concise and practical. You are not a substitute for a vet — for "
    "signs of serious illness, say so and recommend the user also consult one."
)


def _get_settings(db: Session) -> AgentSettings:
    settings = db.query(AgentSettings).filter_by(id="default").first()
    if not settings or not settings.provider or not settings.model:
        raise AgentNotConfigured("The AI assistant isn't configured yet — set it up in Settings.")
    return settings


def _build_provider(settings: AgentSettings):
    if settings.provider == "anthropic":
        return AnthropicProvider(api_key=settings.api_key, base_url=settings.base_url, model=settings.model)
    if settings.provider in ("openai", "ollama"):
        default_base_url = "https://api.openai.com/v1" if settings.provider == "openai" else None
        return OpenAICompatibleProvider(
            api_key=settings.api_key,
            base_url=settings.base_url or default_base_url,
            model=settings.model,
            requires_api_key=settings.provider == "openai",
        )
    raise AgentNotConfigured(f"Unknown provider: {settings.provider}")


def run_agent(db: Session, messages: list[ChatMessage]) -> str:
    settings = _get_settings(db)
    provider = _build_provider(settings)

    convo = [{"role": m.role, "content": m.content} for m in messages]

    for _ in range(MAX_ITERATIONS):
        response = provider.complete(system=SYSTEM_PROMPT, messages=convo, tools=TOOL_SCHEMAS)
        if not response.tool_calls:
            return response.text or ""

        convo.append({
            "role": "assistant",
            "content": response.text or "",
            "tool_calls": [{"id": tc.id, "name": tc.name, "arguments": tc.arguments} for tc in response.tool_calls],
        })
        for tc in response.tool_calls:
            result = execute_tool(db, tc.name, tc.arguments)
            convo.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tc.name,
                "content": json.dumps(result, default=str),
            })

    return "I wasn't able to finish answering that within the allowed number of steps — try asking something more specific."
