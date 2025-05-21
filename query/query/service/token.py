from datetime import datetime, timezone
import uuid
from query.database.connection import get_db
from query.model.token import QueryToken
from sqlalchemy import select

#made each async
#async with to close each session instance (get_db returns instance now)

async def get_all_tokens() -> list[QueryToken]:   
    async with get_db() as db:
        result = await db.execute(select(QueryToken))
        return result.scalars().all()

async def get_tokens_by_user_id(user_id: int) -> list[QueryToken]:
    async with get_db() as db:
        result = await db.execute(select(QueryToken).filter(QueryToken.user_id == user_id))
        return result.scalars().all()

async def get_token_by_id(token_id: str) -> QueryToken:
    async with get_db() as db:
        result = await db.execute(select(QueryToken).filter(QueryToken.id == token_id))
        return result.scalar_one_or_none()

async def create_token(user_id: str, expires_at: datetime) -> QueryToken:
    token = QueryToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        expires_at=expires_at
    )
    async with get_db() as db:
        db.add(token)
        await db.commit()
        await db.refresh(token)
        return token

async def revoke_token(token_id: str) -> None:
    async with get_db() as db:
        result = await db.execute(select(QueryToken).filter(QueryToken.id == token_id))
        token = result.scalar_one_or_none()
        if token:
            token.expires_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(token)
        return token

async def validate_token(token: QueryToken) -> bool:
    if token is None:
        return False
        
    now = datetime.now(timezone.utc)
    if token.expires_at.tzinfo is None:
        token.expires_at = token.expires_at.replace(tzinfo=timezone.utc)
        
    return token.expires_at > now