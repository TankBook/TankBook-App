from dataclasses import dataclass, field


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class AgentResponse:
    text: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)
