"""Kerbecs admin resolver client.

Maps gateway-form paths (e.g. /vehicles/123) to the concrete upstream URL by
querying the kerbecs admin /admin-gw/resolve endpoint, mirroring the Go
package gr26/pkg/kerbecs. Answers are cached for `_CACHE_TTL` seconds.
"""

from __future__ import annotations

import threading
import time

import requests
from loguru import logger

_CACHE_TTL = 300.0  # seconds

_endpoint: str | None = None
_user: str | None = None
_password: str | None = None
_cache: dict[str, tuple[str, float]] = {}
_lock = threading.RLock()


def init(endpoint: str | None, user: str | None, password: str | None) -> None:
    """Configure the resolver. Lookups happen lazily on first resolve()."""
    global _endpoint, _user, _password
    if not endpoint:
        logger.warning("KERBECS_ENDPOINT not set; service-to-service calls will fail")
        return
    _endpoint = endpoint.rstrip("/")
    _user = user
    _password = password
    logger.info(f"Kerbecs resolver configured against {_endpoint}")


def resolve(method: str, path: str) -> str:
    """Return the full upstream URL for `method path`. Raises on failure."""
    if not _endpoint:
        raise RuntimeError("kerbecs resolver not initialized")

    key = f"{method} {path}"
    now = time.monotonic()

    with _lock:
        hit = _cache.get(key)
        if hit and hit[1] > now:
            return hit[0]

    auth = (_user, _password) if _user else None
    r = requests.get(
        f"{_endpoint}/admin-gw/resolve",
        params={"path": path, "method": method},
        auth=auth,
        timeout=5,
    )
    if r.status_code == 404:
        raise RuntimeError(f"no upstream registered for {path}")
    r.raise_for_status()

    body = r.json()
    if not body.get("matched"):
        raise RuntimeError(f"no upstream registered for {path}")

    upstream_url = body["url"].rstrip("/") + body.get("rewritten_path", "")
    with _lock:
        _cache[key] = (upstream_url, now + _CACHE_TTL)
    return upstream_url
