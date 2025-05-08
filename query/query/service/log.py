from datetime import datetime, timezone
import uuid
from query.database.connection import get_db
from query.model.log import QueryLog
from sqlalchemy.orm import Session

def get_all_logs() -> list[QueryLog]:
    db = get_db()
    return db.query(QueryLog).all()

def get_logs_by_user_id(user_id: int) -> list[QueryLog]:
    db = get_db()
    return db.query(QueryLog).filter(QueryLog.user_id == user_id).all()

def get_log_by_id(log_id: int) -> QueryLog:
    db = get_db()
    return db.query(QueryLog).filter(QueryLog.id == log_id).first()

def create_log(log: QueryLog) -> QueryLog:
    log.id = uuid.uuid4()
    log.created_at = datetime.now(timezone.utc)
    db = get_db()
    db.add(log)
    db.commit()
    db.refresh(log)
    return log