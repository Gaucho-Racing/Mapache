from sqlalchemy import Column, String, Text
from query.model.base import Base

class SignalDefinition(Base):
    __tablename__ = "signal_definition"

    id = Column(String(255), primary_key=True)
    vehicle_type = Column(String(255))
    name = Column(String(255))
    description = Column(Text)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_type": self.vehicle_type,
            "name": self.name,
            "description": self.description,
        }
