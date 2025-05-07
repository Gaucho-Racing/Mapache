from sqlalchemy import Column, String, DateTime
from datetime import datetime
from datetime import timezone
from query.model.base import Base

class QueryToken(Base):
    __tablename__ = "query_token"

    id = Column(String(255), primary_key=True)
    user_id = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime)