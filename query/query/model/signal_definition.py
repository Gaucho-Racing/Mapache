from dataclasses import dataclass
from typing import Optional


@dataclass
class SignalDefinition:
    id: Optional[str] = None
    vehicle_type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_type": self.vehicle_type,
            "name": self.name,
            "description": self.description,
        }
