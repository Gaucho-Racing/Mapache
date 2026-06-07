from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class QueryLog:
    user_id: Optional[str] = None
    parameters: Optional[str] = None
    status_code: Optional[int] = None
    latency: Optional[int] = None
    error_message: Optional[str] = None
    id: Optional[str] = None
    timestamp: Optional[datetime] = None

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
