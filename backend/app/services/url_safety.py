"""Guards against SSRF for the two places the backend fetches a user-supplied URL:
species-import (must only ever reach the public internet) and the AI provider base_url
(intentionally allowed to reach LAN/localhost — e.g. a self-hosted Ollama instance — so
only cloud metadata endpoints, never a legitimate target, are blocked there)."""
import ipaddress
import socket
from urllib.parse import urlparse

# Cloud-provider instance-metadata endpoints hand out credentials to whatever can reach
# them — never a legitimate target for a server-side fetch, no matter who configured it.
METADATA_HOSTS = {"169.254.169.254", "fd00:ec2::254", "metadata.google.internal"}


class UnsafeUrlError(ValueError):
    pass


def _resolved_ips(hostname: str) -> list[str]:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return []
    return list({info[4][0] for info in infos})


def _is_private_or_reserved(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True
    return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified


def assert_public_url(url: str) -> None:
    """Raise if url's host doesn't resolve to a public internet address — for fetches
    that should only ever reach the public internet (e.g. importing a species file)."""
    hostname = urlparse(url).hostname
    if not hostname:
        raise UnsafeUrlError("URL has no hostname")
    if hostname.lower() in METADATA_HOSTS:
        raise UnsafeUrlError("URL targets a blocked address")
    ips = _resolved_ips(hostname)
    if not ips:
        raise UnsafeUrlError("Could not resolve host")
    if any(_is_private_or_reserved(ip) for ip in ips):
        raise UnsafeUrlError("URL resolves to a private or reserved address")


def assert_not_metadata_endpoint(url: str) -> None:
    """Raise only if url targets a known cloud metadata endpoint — used where private/LAN
    targets are a legitimate, intended use (e.g. a self-hosted Ollama instance), but
    credential-theft-via-metadata-service never is."""
    hostname = urlparse(url).hostname
    if not hostname:
        return
    if hostname.lower() in METADATA_HOSTS:
        raise UnsafeUrlError("URL targets a blocked address")
    if any(ip in METADATA_HOSTS for ip in _resolved_ips(hostname)):
        raise UnsafeUrlError("URL targets a blocked address")
