from datetime import datetime, timezone
import ulid
from query.database.connection import get_client
from query.model.log import QueryLog

_COLS = "id, user_id, parameters, status_code, latency, error_message, timestamp"
_INSERT_COLS = [
    "id", "user_id", "parameters", "status_code",
    "latency", "error_message", "timestamp",
]


def _row_to_log(row) -> QueryLog:
    return QueryLog(
        id=row[0],
        user_id=row[1],
        parameters=row[2],
        status_code=row[3],
        latency=row[4],
        error_message=row[5],
        timestamp=row[6],
    )


def get_all_logs() -> list[QueryLog]:
    rows = get_client().query(
        f"SELECT {_COLS} FROM query_log ORDER BY timestamp DESC"
    ).result_rows
    return [_row_to_log(r) for r in rows]


def get_logs_by_user_id(user_id: str) -> list[QueryLog]:
    rows = get_client().query(
        f"SELECT {_COLS} FROM query_log WHERE user_id = {{user_id:String}} "
        "ORDER BY timestamp DESC",
        parameters={"user_id": user_id},
    ).result_rows
    return [_row_to_log(r) for r in rows]


def get_log_by_id(log_id: str) -> QueryLog | None:
    rows = get_client().query(
        f"SELECT {_COLS} FROM query_log WHERE id = {{id:String}} LIMIT 1",
        parameters={"id": log_id},
    ).result_rows
    return _row_to_log(rows[0]) if rows else None


def create_log(log: QueryLog) -> QueryLog:
    log.id = ulid.make().prefixed("qlog")
    log.timestamp = datetime.now(timezone.utc)
    get_client().insert(
        "query_log",
        [[
            log.id,
            log.user_id or "",
            log.parameters or "",
            int(log.status_code or 0),
            int(log.latency or 0),
            log.error_message or "",
            log.timestamp,
        ]],
        column_names=_INSERT_COLS,
    )
    return log
