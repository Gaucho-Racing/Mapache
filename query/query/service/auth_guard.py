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
    try:
        user_id = AuthService.get_user_id_from_token(token)
    except Exception as e:
        # AuthService raises bare Exception for expired / malformed /
        # bad-issuer tokens. Surface those as 401 so the dashboard's
        # checkCredentials() can catch them and bounce to login —
        # bare Exception otherwise becomes a 500 via FastAPI's default
        # handler, which looks like a server bug.
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))
    logger.info(f"Successfully authenticated user: {user_id}")
    return user_id
