from query.database.connection import get_client
from query.model.signal_definition import SignalDefinition

_COLS = "id, vehicle_type, name, description"


def _row_to_definition(row) -> SignalDefinition:
    return SignalDefinition(
        id=row[0],
        vehicle_type=row[1],
        name=row[2],
        description=row[3],
    )


def get_all_signal_definitions() -> list[SignalDefinition]:
    rows = get_client().query(
        f"SELECT {_COLS} FROM signal_definition FINAL ORDER BY id"
    ).result_rows
    return [_row_to_definition(r) for r in rows]


def get_signal_definitions_by_vehicle_type(vehicle_type: str) -> list[SignalDefinition]:
    rows = get_client().query(
        f"SELECT {_COLS} FROM signal_definition FINAL "
        "WHERE vehicle_type = {vehicle_type:String} ORDER BY id",
        parameters={"vehicle_type": vehicle_type},
    ).result_rows
    return [_row_to_definition(r) for r in rows]


def get_signal_definition_by_id(signal_definition_id: str) -> SignalDefinition | None:
    rows = get_client().query(
        f"SELECT {_COLS} FROM signal_definition FINAL "
        "WHERE id = {id:String} LIMIT 1",
        parameters={"id": signal_definition_id},
    ).result_rows
    return _row_to_definition(rows[0]) if rows else None
