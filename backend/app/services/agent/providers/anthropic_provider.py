import httpx

from app.services.agent.errors import AgentNotConfigured, AgentProviderError
from app.services.agent.providers.base import AgentResponse, ToolCall
from app.services.url_safety import assert_not_metadata_endpoint, UnsafeUrlError

ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_BASE_URL = "https://api.anthropic.com"


class AnthropicProvider:
    def __init__(self, api_key: str | None, base_url: str | None, model: str):
        if not api_key:
            raise AgentNotConfigured("An API key is required for Claude.")
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.model = model

    def complete(self, system: str, messages: list[dict], tools: list[dict], force_tool: str | None = None) -> AgentResponse:
        wire_messages: list[dict] = []
        for m in messages:
            if m["role"] == "tool":
                block = {"type": "tool_result", "tool_use_id": m["tool_call_id"], "content": m["content"]}
                # Anthropic wants consecutive tool results folded into the same user turn.
                if wire_messages and wire_messages[-1]["role"] == "user" and isinstance(wire_messages[-1]["content"], list):
                    wire_messages[-1]["content"].append(block)
                else:
                    wire_messages.append({"role": "user", "content": [block]})
            elif m["role"] == "assistant" and m.get("tool_calls"):
                content = []
                if m["content"]:
                    content.append({"type": "text", "text": m["content"]})
                for tc in m["tool_calls"]:
                    content.append({"type": "tool_use", "id": tc["id"], "name": tc["name"], "input": tc["arguments"]})
                wire_messages.append({"role": "assistant", "content": content})
            else:
                wire_messages.append({"role": m["role"], "content": m["content"]})

        body = {
            "model": self.model,
            "max_tokens": 2048,
            "system": system,
            "messages": wire_messages,
            "tools": [
                {"name": t["name"], "description": t["description"], "input_schema": t["parameters"]}
                for t in tools
            ],
        }
        if force_tool:
            body["tool_choice"] = {"type": "tool", "name": force_tool}
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "Content-Type": "application/json",
        }

        try:
            assert_not_metadata_endpoint(self.base_url)
            resp = httpx.post(f"{self.base_url}/v1/messages", json=body, headers=headers, timeout=60)
            resp.raise_for_status()
        except UnsafeUrlError as e:
            raise AgentProviderError(f"Refusing to contact this provider: {e}")
        except httpx.HTTPStatusError as e:
            raise AgentProviderError(f"Provider returned an error: {e.response.status_code} {e.response.text[:300]}")
        except httpx.HTTPError as e:
            raise AgentProviderError(f"Couldn't reach the provider: {e}")

        data = resp.json()
        text_parts = []
        tool_calls = []
        for block in data.get("content", []):
            if block["type"] == "text":
                text_parts.append(block["text"])
            elif block["type"] == "tool_use":
                tool_calls.append(ToolCall(id=block["id"], name=block["name"], arguments=block.get("input") or {}))

        return AgentResponse(text="\n".join(text_parts) if text_parts else None, tool_calls=tool_calls)
