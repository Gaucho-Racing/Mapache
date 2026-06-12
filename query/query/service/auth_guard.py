"""Bearer-token auth helper that respects SKIP_AUTH_CHECK.

Centralizes the same eight-line dance every route was doing inline, so new
routes don't drift in how they handle the bypass flag.
"""

from fastapi import Header, HTTPException
from loguru import logger

from query.config.config import Config
from query.service.auth import AuthService


def require_user(authorization: str | None = Header(None)) -> str:
    if Config.SKIP_AUTH_CHECK:
        return "mock-user"
    if not authorization or "Bearer " not in authorization:
        raise HTTPException(
            status_code=401,
            detail="you are not authorized to access this resource",
        )
    token = authorization.split("Bearer ")[1]
    user_id = AuthService.get_user_id_from_token(token)
    logger.info(f"Successfully authenticated user: {user_id}")
    return user_id
