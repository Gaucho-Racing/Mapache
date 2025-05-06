from datetime import datetime
import uuid
from query.database.connection import get_db
from query.model.log import Log
from sqlalchemy.orm import Session

def get_all_logs() -> list[Log]:
    db = get_db()
    return db.query(Log).all()

def get_logs_by_user_id(user_id: int) -> list[Log]:
    db = get_db()
    return db.query(Log).filter(Log.user_id == user_id).all()

def get_log_by_id(log_id: int) -> Log:
    db = get_db()
    return db.query(Log).filter(Log.id == log_id).first()

def create_log(log: Log) -> Log:
    log.id = uuid.uuid4()
    log.created_at = datetime.now(datetime.UTC)
    db = get_db()
    db.add(log)
    db.commit()
    db.refresh(log)
    return log