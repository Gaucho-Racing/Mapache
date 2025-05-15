from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from datetime import timezone
from query.model.base import Base

class QueryLog(Base):
    __tablename__ = "query_log"

    id = Column(String(255), primary_key=True)
    user_id = Column(String(255))
    parameters = Column(Text)
    status_code = Column(Integer)
    latency = Column(Integer)
    error_message = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "parameters": self.parameters,
            "status_code": self.status_code,
            "latency": self.latency,
            "error_message": self.error_message,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }
