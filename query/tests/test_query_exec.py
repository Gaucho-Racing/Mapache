"""Tests for the ClickHouse SQL builder + response shaping (query_exec.py).

The ClickHouse client is monkeypatched to record the SQL/params it receives and
return canned rows, so nothing here needs a live database. Covers LIKE-escaping
of filter literals, the in/not-in OR/AND grouping, the window-global sigma reject
path, and JSON-safe coercion of non-finite floats.
"""

from datetime import datetime, timezone

import pytest

from query.service import query_exec
from query.service.query_lang import parse
from query.service.signals import utc_iso

START = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
END = datetime(2026, 1, 1, 0, 0, 5, tzinfo=timezone.utc)


def _b(sec: int) -> datetime:
    return datetime(2026, 1, 1, 0, 0, sec, tzinfo=timezone.utc)


class _FakeResult:
    def __init__(self, rows):
        self.result_rows = rows


class _Recorder:
    """Captures every (sql, params) and replays canned rows in FIFO order."""

    def __init__(self, row_batches):
        self._batches = list(row_batches)
        self.calls: list[tuple[str, dict]] = []

    def query(self, sql, parameters=None):
        self.calls.append((sql, dict(parameters or {})))
        rows = self._batches.pop(0) if self._batches else []
        return _FakeResult(rows)


def _install(monkeypatch, *row_batches):
    rec = _Recorder(row_batches)
    monkeypatch.setattr(query_exec, "get_clickhouse", lambda: rec)
    return rec


def _run(q, rec_first_batch=None):
    return query_exec.run_query(q, "veh-1", START, END, "1s")


# ---------------------------------------------------------------------------
# Filter SQL — LIKE escaping (the bug fix)
# ---------------------------------------------------------------------------


def test_wildcard_translates_to_like(monkeypatch):
    rec = _install(monkeypatch, [])
    _run(parse('count(signal).where(name = "ecu*")'))
    sql, params = rec.calls[0]
    assert "name LIKE {f_name_eq_0:String}" in sql
    assert params["f_name_eq_0"] == "ecu%"


def test_like_escapes_literal_underscore(monkeypatch):
    # `ecu_acc*` must match `ecu_acc...` literally, NOT `ecuXacc...`: the `_`
    # is escaped before `*` becomes `%`.
    rec = _install(monkeypatch, [])
    _run(parse('count(signal).where(name = "ecu_acc*")'))
    _, params = rec.calls[0]
    assert params["f_name_eq_0"] == r"ecu\_acc%"


def test_like_escapes_literal_percent_and_backslash(monkeypatch):
    rec = _install(monkeypatch, [])
    _run(parse(r'count(signal).where(name = "a%b\c*")'))
    _, params = rec.calls[0]
    # backslash doubled, percent escaped, then `*` -> `%`.
    assert params["f_name_eq_0"] == "a\\%b\\\\c%"


def test_not_like_for_negated_wildcard(monkeypatch):
    rec = _install(monkeypatch, [])
    _run(parse('count(signal).where(name != "ecu*")'))
    sql, params = rec.calls[0]
    assert "name NOT LIKE {f_name_ne_0:String}" in sql
    assert params["f_name_ne_0"] == "ecu%"


def test_non_wildcard_equality_unaffected(monkeypatch):
    # No `*` -> plain `=`, and underscores are NOT escaped (it's not a LIKE).
    rec = _install(monkeypatch, [])
    _run(parse('count(signal).where(name = "ecu_acc_pedal")'))
    sql, params = rec.calls[0]
    assert "name = {f_name_eq_0:String}" in sql
    assert params["f_name_eq_0"] == "ecu_acc_pedal"


# ---------------------------------------------------------------------------
# in / not in — OR within a column, AND for none-of
# ---------------------------------------------------------------------------


def test_in_groups_with_or(monkeypatch):
    rec = _install(monkeypatch, [])
    _run(parse('count(signal).where(name in ("a", "b"))'))
    sql, params = rec.calls[0]
    assert "(name = {f_name_eq_0:String} OR name = {f_name_eq_1:String})" in sql
    assert params["f_name_eq_0"] == "a"
    assert params["f_name_eq_1"] == "b"


def test_not_in_groups_with_and(monkeypatch):
    rec = _install(monkeypatch, [])
    _run(parse('count(signal).where(name not in ("a", "b"))'))
    sql, params = rec.calls[0]
    assert (
        "(name != {f_name_ne_0:String} AND name != {f_name_ne_1:String})" in sql
    )
    assert params["f_name_ne_0"] == "a"
    assert params["f_name_ne_1"] == "b"


# ---------------------------------------------------------------------------
# Aggregator / group-by SQL shape
# ---------------------------------------------------------------------------


def test_agg_aliases_agg_value_not_value(monkeypatch):
    # `AS value` would shadow the raw `value` column a reject references.
    rec = _install(monkeypatch, [])
    _run(parse("avg(value)"))
    sql, _ = rec.calls[0]
    assert "avg(value) AS agg_value" in sql
    assert " AS value" not in sql


def test_group_by_emits_series_alias(monkeypatch):
    rec = _install(monkeypatch, [])
    _run(parse("count(signal).by(name)"))
    sql, _ = rec.calls[0]
    assert "name AS series_name" in sql
    assert "GROUP BY bucket, series_name" in sql


def test_explicit_every_overrides_interval(monkeypatch):
    rec = _install(monkeypatch, [], [])
    out = query_exec.run_query(
        parse("count(signal).every(100ms)"), "veh-1", START, END, "1s"
    )
    assert out["interval"] == "100ms"


# ---------------------------------------------------------------------------
# Reject — value path (cheap NOT) vs sigma path (window subquery)
# ---------------------------------------------------------------------------


def test_value_reject_uses_not_on_main_where(monkeypatch):
    # value/raw_value rejects stay on the cheap NOT(...) path — no subquery.
    rec = _install(monkeypatch, [], [])
    query_exec.run_query(
        parse("avg(value).reject(value > 100)"), "veh-1", START, END, "1s"
    )
    sql, params = rec.calls[0]
    assert "NOT (" in sql
    assert "OVER (" not in sql
    # threshold parameterized, never interpolated.
    assert 100.0 in params.values()


def test_sigma_reject_builds_window_global_subquery(monkeypatch):
    # sigma forces the window-stats subquery; stats are WINDOW-GLOBAL per series
    # (PARTITION BY the group-by col), not per time bucket.
    rec = _install(monkeypatch, [], [])
    query_exec.run_query(
        parse("last(value).by(name).reject(sigma > 3)"),
        "veh-1",
        START,
        END,
        "1s",
    )
    sql, params = rec.calls[0]
    assert "avg(value) OVER (PARTITION BY name) AS _mean" in sql
    assert "stddevPop(value) OVER (PARTITION BY name) AS _std" in sql
    # sigma expression guards a degenerate (zero-variance) group.
    assert "nullIf(_std, 0)" in sql
    assert "coalesce(" in sql
    assert 3.0 in params.values()


def test_sigma_reject_without_group_has_empty_partition(monkeypatch):
    rec = _install(monkeypatch, [], [])
    query_exec.run_query(
        parse("avg(value).reject(sigma > 2)"), "veh-1", START, END, "1s"
    )
    sql, _ = rec.calls[0]
    assert "avg(value) OVER () AS _mean" in sql


# ---------------------------------------------------------------------------
# Response shaping + JSON-safe coercion
# ---------------------------------------------------------------------------


def test_zero_fill_for_count(monkeypatch):
    # count zero-fills absent buckets; only :00 present.
    _install(monkeypatch, [(_b(0), 5)])
    out = query_exec.run_query(
        parse("count(signal)"), "veh-1", START, END, "1s"
    )
    by_bucket = {p["bucket"]: p["value"] for p in out["series"][0]["points"]}
    assert by_bucket[utc_iso(_b(0))] == 5
    assert by_bucket[utc_iso(_b(2))] == 0


def test_null_fill_for_non_count(monkeypatch):
    _install(monkeypatch, [(_b(0), 10.0)])
    out = query_exec.run_query(
        parse("avg(value)"), "veh-1", START, END, "1s"
    )
    by_bucket = {p["bucket"]: p["value"] for p in out["series"][0]["points"]}
    assert by_bucket[utc_iso(_b(0))] == 10.0
    assert by_bucket[utc_iso(_b(2))] is None


def test_empty_result_still_emits_one_series(monkeypatch):
    _install(monkeypatch, [])
    out = query_exec.run_query(
        parse("avg(value)"), "veh-1", START, END, "1s"
    )
    assert len(out["series"]) == 1


def test_non_finite_agg_coerced_to_none(monkeypatch):
    # An agg over an all-NULL bucket can come back as NaN/Inf; these must become
    # None so JSONResponse(allow_nan=False) doesn't blow up.
    _install(monkeypatch, [(_b(0), float("nan")), (_b(1), float("inf"))])
    out = query_exec.run_query(
        parse("avg(value)"), "veh-1", START, END, "1s"
    )
    by_bucket = {p["bucket"]: p["value"] for p in out["series"][0]["points"]}
    assert by_bucket[utc_iso(_b(0))] is None
    assert by_bucket[utc_iso(_b(1))] is None


def test_coerce_number_handles_decimal_like():
    from decimal import Decimal

    assert query_exec._coerce_number(Decimal("3.5")) == 3.5
    assert query_exec._coerce_number(None) is None
    assert query_exec._coerce_number(float("nan")) is None
    assert query_exec._coerce_number(7) == 7


# ---------------------------------------------------------------------------
# Invalid interval surfaces loudly
# ---------------------------------------------------------------------------


def test_invalid_request_interval_raises(monkeypatch):
    _install(monkeypatch, [])
    with pytest.raises(ValueError):
        query_exec.run_query(
            parse("count(signal)"), "veh-1", START, END, "7s"
        )
