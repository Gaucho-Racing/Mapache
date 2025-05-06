from query.database.connection import get_db
from query.model import *
from sqlalchemy import text

def check_vehicle_exists(vehicle_id: str) -> bool:
    db = get_db()
    result = db.execute(
        text("SELECT EXISTS (SELECT 1 FROM vehicle WHERE id = :id)"),
        {"id": vehicle_id}
    ).scalar()
    return bool(result)