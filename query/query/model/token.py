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

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None
        }