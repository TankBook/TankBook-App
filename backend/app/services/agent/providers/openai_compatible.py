import json
import httpx

from app.services.agent.errors import AgentNotConfigured, AgentProviderError
from app.services.agent.providers.base import AgentResponse, ToolCall


class OpenAICompatibleProvider:
    """Talks to the OpenAI Chat Completions wire format — used for both the
    "openai" provider and Ollama, which exposes an OpenAI-compatible endpoint."""

    def __init__(self, api_key: str | None, base_url: str | None, model: str, requires_api_key: bool = False):
        if not base_url:
            raise AgentNotConfigured("A base URL is required for this provider.")
        if requires_api_key and not api_key:
            raise AgentNotConfigured("An API key is required for this provider.")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    def complete(self, system: str, messages: list[dict], tools: list[dict], force_tool: str | None = None) -> AgentResponse:
        wire_messages = [{"role": "system", "content": system}]
        for m in messages:
            if m["role"] == "tool":
                wire_messages.append({"role": "tool", "tool_call_id": m["tool_call_id"], "content": m["content"]})
            elif m["role"] == "assistant" and m.get("tool_calls"):
                wire_messages.append({
                    "role": "assistant",
                    "content": m["content"] or None,
                    "tool_calls": [
                        {
                            "id": tc["id"],
                            "type": "function",
                            "function": {"name": tc["name"], "arguments": json.dumps(tc["arguments"])},
                        }
                        for tc in m["tool_calls"]
                    ],
                })
            else:
                wire_messages.append({"role": m["role"], "content": m["content"]})

        body = {
            "model": self.model,
            "messages": wire_messages,
            "tools": [{"type": "function", "function": t} for t in tools],
        }
        if force_tool:
            body["tool_choice"] = {"type": "function", "function": {"name": force_tool}}
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            resp = httpx.post(f"{self.base_url}/chat/completions", json=body, headers=headers, timeout=60)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise AgentProviderError(f"Provider returned an error: {e.response.status_code} {e.response.text[:300]}")
        except httpx.HTTPError as e:
            raise AgentProviderError(f"Couldn't reach the provider: {e}")

        message = resp.json()["choices"][0]["message"]
        raw_tool_calls = message.get("tool_calls") or []
        tool_calls = [
            ToolCall(
                id=tc["id"],
                name=tc["function"]["name"],
                arguments=json.loads(tc["function"]["arguments"] or "{}"),
            )
            for tc in raw_tool_calls
        ]
        return AgentResponse(text=message.get("content"), tool_calls=tool_calls)
