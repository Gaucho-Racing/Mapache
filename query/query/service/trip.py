from query.database.connection import get_db
from query.model.query import TripNotFoundError
from sqlalchemy import text

def query_trip(trip_id, lap_num=None): # lap not incorperated yet
    db = get_db()
    result = db.execute(
        text("SELECT start_time, end_time FROM trip WHERE id = :id"),
        {"id": trip_id}
        ).fetchone()
    if not result:
        raise TripNotFoundError
    
    if lap_num: # index from 1
        pass

    return result[0], result[1]