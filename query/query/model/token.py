from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class QueryToken:
    id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None
        }
