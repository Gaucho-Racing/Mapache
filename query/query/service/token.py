from datetime import datetime, timezone
import ulid
from query.database.connection import get_client
from query.model.token import QueryToken

_COLS = "id, user_id, created_at, expires_at"
_INSERT_COLS = ["id", "user_id", "created_at", "expires_at", "updated_at"]


def _row_to_token(row) -> QueryToken:
    return QueryToken(
        id=row[0],
        user_id=row[1],
        created_at=row[2],
        expires_at=row[3],
    )


def _insert(token: QueryToken) -> None:
    # query_token is a ReplacingMergeTree(updated_at) keyed on id; a fresh
    # updated_at on every write makes the latest insert win on FINAL.
    get_client().insert(
        "query_token",
        [[token.id, token.user_id, token.created_at, token.expires_at,
          datetime.now(timezone.utc)]],
        column_names=_INSERT_COLS,
    )


def get_all_tokens() -> list[QueryToken]:
    rows = get_client().query(
        f"SELECT {_COLS} FROM query_token FINAL ORDER BY created_at DESC"
    ).result_rows
    return [_row_to_token(r) for r in rows]


def get_tokens_by_user_id(user_id: str) -> list[QueryToken]:
    rows = get_client().query(
        f"SELECT {_COLS} FROM query_token FINAL WHERE user_id = {{user_id:String}} "
        "ORDER BY created_at DESC",
        parameters={"user_id": user_id},
    ).result_rows
    return [_row_to_token(r) for r in rows]


def get_token_by_id(token_id: str) -> QueryToken | None:
    rows = get_client().query(
        f"SELECT {_COLS} FROM query_token FINAL WHERE id = {{id:String}} LIMIT 1",
        parameters={"id": token_id},
    ).result_rows
    return _row_to_token(rows[0]) if rows else None


def create_token(user_id: str, expires_at: datetime) -> QueryToken:
    token = QueryToken(
        id=ulid.make().prefixed("qtk"),
        user_id=user_id,
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
    )
    _insert(token)
    return token


def revoke_token(token_id: str) -> QueryToken | None:
    token = get_token_by_id(token_id)
    if token is None:
        return None
    # Revoking is a re-insert with expires_at pulled back to now; FINAL then
    # surfaces the expired row.
    token.expires_at = datetime.now(timezone.utc)
    _insert(token)
    return token


def validate_token(token: QueryToken) -> bool:
    if token is None:
        return False

    now = datetime.now(timezone.utc)
    if token.expires_at.tzinfo is None:
        token.expires_at = token.expires_at.replace(tzinfo=timezone.utc)

    return token.expires_at > now
