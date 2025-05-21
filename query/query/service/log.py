from datetime import datetime, timezone
import uuid
from query.database.connection import get_db
from query.model.log import QueryLog
from sqlalchemy import select

#same as with token

async def get_all_logs() -> list[QueryLog]:
    async with get_db() as db:
        result = await db.execute(select(QueryLog))
        return result.scalars().all()

async def get_logs_by_user_id(user_id: int) -> list[QueryLog]:
    async with get_db() as db:
        result = await db.execute(select(QueryLog).filter(QueryLog.user_id == user_id))
        return result.scalars().all()

async def get_log_by_id(log_id: str) -> QueryLog:
    async with get_db() as db:
        result = await db.execute(select(QueryLog).filter(QueryLog.id == log_id))
        return result.scalar_one_or_none()

async def create_log(log: QueryLog) -> QueryLog:
    log.id = str(uuid.uuid4())
    log.created_at = datetime.now(timezone.utc)
    async with get_db() as db:
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log