import json
from sqlalchemy.orm import Session

from app.models.models import AgentSettings
from app.schemas.schemas import ChatMessage
from app.services.agent.errors import AgentNotConfigured, AgentProviderError
from app.services.agent.tools import TOOL_SCHEMAS, execute_tool
from app.services.agent.providers.openai_compatible import OpenAICompatibleProvider
from app.services.agent.providers.anthropic_provider import AnthropicProvider

MAX_ITERATIONS = 6

SYSTEM_PROMPT = (
    "You are the TankBook Assistant, a diagnostic aquarium-keeping assistant built into a self-hosted "
    "aquarium management app. You have read-only tools to look up:\n"
    "- the user's tanks, their configuration, and current fish/plants\n"
    "- water parameter history for a tank\n"
    "- alerts\n"
    "- journal entries (observations, illness, treatments, deaths, etc)\n"
    "- maintenance tasks\n"
    "- the household tap/source water test results — the app's 'Tap Water' section, not tied to any one "
    "tank\n"
    "- the species reference catalogue and tank compatibility checks\n\n"
    "Always use these tools to ground your answers in the user's actual data rather than guessing. When "
    "diagnosing a water quality problem in a tank, also check the tap water test results — many tank "
    "issues (pH swings, high nitrate, chlorine) trace back to the source water rather than the tank "
    "itself, so don't overlook it. Check journal entries and alerts before commenting on a tank's "
    "history. You cannot create, modify, or delete any data. Be concise and practical, and format "
    "answers in Markdown (**bold**, '- ' bullet lists, etc) since the app renders it. You are not a "
    "substitute for a vet — for signs of serious illness, say so and recommend the user also consult one."
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


SPECIES_DRAFT_TOOL = {
    "name": "submit_species_draft",
    "description": "Submit a structured aquarium/vivarium species care-sheet draft.",
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {"type": "string", "description": "Lowercase kebab-case identifier derived from the common name, e.g. 'neon-tetra'"},
            "common_name": {"type": "string"},
            "latin_name": {"type": "string", "description": "Scientific binomial name"},
            "type": {"type": "string", "enum": ["fish", "plant", "invertebrate", "amphibian"]},
            "family": {"type": "string"},
            "origin": {"type": "string", "description": "Native geographic region"},
            "care": {
                "type": "object",
                "properties": {
                    "difficulty": {"type": "string", "enum": ["beginner", "intermediate", "advanced"]},
                    "min_tank_litres": {"type": "number"},
                    "shoal_min": {"type": "integer", "description": "Minimum shoal/school size, if relevant"},
                    "group_min": {"type": "integer", "description": "Minimum group size, if relevant and different from shoal_min"},
                    "max_size_cm": {"type": "number"},
                    "lifespan_years": {"type": "number"},
                    "growth_rate": {"type": "string", "enum": ["slow", "medium", "fast"]},
                },
            },
            "water": {
                "type": "object",
                "properties": {
                    "temp_c": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}}},
                    "ph": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}}},
                    "gh_dgh": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}}},
                    "kh_dkh": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}}},
                },
            },
            "compatibility": {
                "type": "object",
                "properties": {"temperament": {"type": "string", "enum": ["peaceful", "semi-aggressive", "aggressive"]}},
            },
            "light": {
                "type": "object",
                "properties": {"requirement": {"type": "string", "enum": ["low", "medium", "high"]}},
            },
            "co2_required": {"type": "boolean", "description": "Only meaningful for plants"},
            "notes": {"type": "string", "description": "A couple of sentences of practical care notes"},
        },
        "required": ["slug", "common_name", "latin_name", "type"],
    },
}

SPECIES_DRAFT_SYSTEM_PROMPT = (
    "You are an aquarium/vivarium species care-sheet writer for TankBook. Given a common or scientific "
    "species name, call submit_species_draft exactly once with accurate, typical care data for that "
    "species. If you are not confident about a particular field, omit it rather than guessing — an "
    "incomplete draft the user fills in themselves is much better than a confident wrong number. "
    "slug must be lowercase kebab-case derived from the common name. type must be exactly one of fish, "
    "plant, invertebrate, or amphibian."
)


def draft_species(db: Session, name: str) -> dict:
    settings = _get_settings(db)
    provider = _build_provider(settings)
    response = provider.complete(
        system=SPECIES_DRAFT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Species: {name}"}],
        tools=[SPECIES_DRAFT_TOOL],
        force_tool="submit_species_draft",
    )
    if not response.tool_calls:
        raise AgentProviderError("The AI didn't return a structured draft.")
    return response.tool_calls[0].arguments


def run_agent(db: Session, messages: list[ChatMessage], owner_id: str) -> str:
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
            result = execute_tool(db, tc.name, tc.arguments, owner_id)
            convo.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tc.name,
                "content": json.dumps(result, default=str),
            })

    return "I wasn't able to finish answering that within the allowed number of steps — try asking something more specific."
