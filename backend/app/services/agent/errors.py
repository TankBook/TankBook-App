class AgentNotConfigured(Exception):
    """The assistant isn't configured, or is missing something it needs (base URL, API key)."""


class AgentProviderError(Exception):
    """A configured provider was called but the request itself failed."""
