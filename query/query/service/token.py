from datetime import datetime
import uuid
from query.database.connection import get_db
from query.model.token import QueryToken
from sqlalchemy.orm import Session

def get_all_tokens() -> list[QueryToken]:   
    db = get_db()
    return db.query(QueryToken).all()

def get_tokens_by_user_id(user_id: int) -> list[QueryToken]:
    db = get_db()
    return db.query(QueryToken).filter(QueryToken.user_id == user_id).all()

def get_token_by_id(token_id: int) -> QueryToken:
    db = get_db()
    return db.query(QueryToken).filter(QueryToken.id == token_id).first()

def create_token(user_id: str, expires_at: datetime) -> QueryToken:
    token = QueryToken(
        id=uuid.uuid4(),
        user_id=user_id,
        expires_at=expires_at
    )
    db = get_db()
    db.add(token)
    db.commit()
    db.refresh(token)
    return token

def revoke_token(token_id: str) -> None:
    db = get_db()
    token = db.query(QueryToken).filter(QueryToken.id == token_id).first()
    token.expires_at = datetime.now(datetime.UTC)
    db.commit()
    db.refresh(token)
    return token

def validate_token(token: QueryToken) -> bool:
    return token is not None and token.expires_at > datetime.now(datetime.UTC)