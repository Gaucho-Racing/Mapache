from query.database.connection import get_db
from query.model.signal_definition import SignalDefinition

def get_all_signal_definitions() -> list[SignalDefinition]:
    with get_db() as db:
        return db.query(SignalDefinition).all()

def get_signal_definitions_by_vehicle_type(vehicle_type: str) -> list[SignalDefinition]:
    with get_db() as db:
        return db.query(SignalDefinition).filter(SignalDefinition.vehicle_type == vehicle_type).all()

def get_signal_definition_by_id(signal_definition_id: int) -> SignalDefinition:
    with get_db() as db:
        return db.query(SignalDefinition).filter(SignalDefinition.id == signal_definition_id).first()