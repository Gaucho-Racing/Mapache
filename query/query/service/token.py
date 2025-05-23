from datetime import datetime, timezone
import uuid
from query.database.connection import get_db
from query.model.token import QueryToken
from sqlalchemy.orm import Session

def get_all_tokens() -> list[QueryToken]:   
    with get_db() as db:
        return db.query(QueryToken).all()

def get_tokens_by_user_id(user_id: int) -> list[QueryToken]:
    with get_db() as db:
        return db.query(QueryToken).filter(QueryToken.user_id == user_id).all()

def get_token_by_id(token_id: int) -> QueryToken:
    with get_db() as db:
        return db.query(QueryToken).filter(QueryToken.id == token_id).first()

def create_token(user_id: str, expires_at: datetime) -> QueryToken:
    token = QueryToken(
        id=uuid.uuid4(),
        user_id=user_id,
        expires_at=expires_at
    )
    with get_db() as db:
        db.add(token)
        return token

def revoke_token(token_id: str) -> None:
    with get_db() as db:
        token = db.query(QueryToken).filter(QueryToken.id == token_id).first()
        token.expires_at = datetime.now(timezone.utc)
        return token

def validate_token(token: QueryToken) -> bool:
    if token is None:
        return False
        
    now = datetime.now(timezone.utc)
    if token.expires_at.tzinfo is None:
        token.expires_at = token.expires_at.replace(tzinfo=timezone.utc)
        
    return token.expires_at > now