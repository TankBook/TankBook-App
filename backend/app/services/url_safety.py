"""Guards against SSRF for the two places the backend fetches a user-supplied URL:
species-import (must only ever reach the public internet) and the AI provider base_url
(intentionally allowed to reach LAN/localhost — e.g. a self-hosted Ollama instance — so
only cloud metadata endpoints, never a legitimate target, are blocked there)."""
import contextlib
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
    # dict.fromkeys dedupes while preserving getaddrinfo's own ordering — a plain set
    # comprehension (the previous approach) discards order, which for a host with both
    # A and AAAA records could hand pinned_dns an IPv6 address on a network with no
    # IPv6 route, breaking the fetch even though the host is perfectly reachable.
    return list(dict.fromkeys(info[4][0] for info in infos))


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


@contextlib.contextmanager
def pinned_dns(hostname: str):
    """Resolve `hostname` once, then force every in-process DNS lookup for that exact
    name (for the duration of this context) to return only the addresses resolved here.

    Without this, a caller can pass assert_public_url()'s check against one IP and then
    have the HTTP client re-resolve the same hostname to a *different* one at connect
    time (a low-TTL or attacker-controlled DNS record) — a classic DNS-rebinding SSRF
    bypass. Pinning closes that gap by guaranteeing the checked and the connected-to
    address are identical. Does not affect TLS SNI/hostname verification, since those
    read the original hostname, not the resolved address.
    """
    ips = _resolved_ips(hostname)
    if not ips:
        raise UnsafeUrlError("Could not resolve host")
    # Prefer an IPv4 address if the host offers one — this environment (and plenty of
    # real deployments) has no outbound IPv6 route, so pinning to a AAAA record for a
    # dual-stack host would turn a perfectly reachable site into a connection failure.
    ipv4 = [ip for ip in ips if ":" not in ip]
    pinned_ip = ipv4[0] if ipv4 else ips[0]
    real_getaddrinfo = socket.getaddrinfo

    def _pinned(host, port, family=0, type=0, proto=0, flags=0):
        if host == hostname:
            return real_getaddrinfo(pinned_ip, port, family, type, proto, flags)
        return real_getaddrinfo(host, port, family, type, proto, flags)

    socket.getaddrinfo = _pinned
    try:
        yield pinned_ip
    finally:
        socket.getaddrinfo = real_getaddrinfo


@contextlib.contextmanager
def fetch_guard(url: str, allow_private: bool = False):
    """Validate `url` (per assert_public_url, or assert_not_metadata_endpoint when
    allow_private) and pin DNS for its host for the duration of the `with` block, so
    whatever fetch happens inside is guaranteed to hit the address that was checked."""
    hostname = urlparse(url).hostname
    if not hostname:
        raise UnsafeUrlError("URL has no hostname")
    if allow_private:
        assert_not_metadata_endpoint(url)
    else:
        assert_public_url(url)
    with pinned_dns(hostname):
        yield
