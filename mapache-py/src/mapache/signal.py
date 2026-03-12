from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Signal:
    id: str = ""
    timestamp: int = 0
    vehicle_id: str = ""
    name: str = ""
    value: float = 0.0
    raw_value: int = 0
    produced_at: datetime = field(default_factory=lambda: datetime.min)
    created_at: datetime = field(default_factory=lambda: datetime.min)
