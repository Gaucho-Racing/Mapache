"""Tests for the /query/pairs decimate + merge_asof path (service/query.py).

The ClickHouse client is monkeypatched: query_df returns a canned DataFrame and
the (sql, params) it was called with is recorded, so nothing here needs a live
database. Covers the shared decimation SQL (vs the full-resolution branch) and
the merge_asof nearest-within-tolerance alignment that backs the XY-scatter
contract.
"""

from datetime import datetime, timezone

import pandas as pd

from query.service import query as query_svc
from query.service.query import merge_signals, query_signals


class _Recorder:
    """Captures every (sql, params) and replays one canned DataFrame."""

    def __init__(self, df: pd.DataFrame):
        self._df = df
        self.calls: list[tuple[str, dict]] = []

    def query_df(self, sql, parameters=None):
        self.calls.append((sql, dict(parameters or {})))
        return self._df.copy()


def _install(monkeypatch, df: pd.DataFrame) -> _Recorder:
    rec = _Recorder(df)
    monkeypatch.setattr(query_svc, "get_clickhouse", lambda: rec)
    return rec


def _rows(triples) -> pd.DataFrame:
    return pd.DataFrame(triples, columns=["bucket_ts", "name", "value"])


# ---------------------------------------------------------------------------
# Decimation SQL — used when max_points + a bounded window are given
# ---------------------------------------------------------------------------


def test_decimation_sql_shape(monkeypatch):
    rec = _install(monkeypatch, _rows([]))
    query_signals(
        "veh-1",
        ["a", "b"],
        start="2026-01-01T00:00:00Z",
        end="2026-01-01T00:00:10Z",
        max_points=5,
    )
    sql, params = rec.calls[0]
    assert "argMin(value, produced_at)" in sql
    assert "intDiv(toUnixTimestamp64Micro(produced_at), {bucket:Int64})" in sql
    # 10s window / 5 points -> 2s buckets -> 2_000_000 micros.
    assert params["bucket"] == 2_000_000
    assert isinstance(params["start"], datetime)
    assert params["start"].tzinfo is None  # naive UTC for DateTime64 binding


def test_full_resolution_sql_when_no_max_points(monkeypatch):
    rec = _install(monkeypatch, _rows([]))
    query_signals(
        "veh-1",
        ["a"],
        start="2026-01-01T00:00:00Z",
        end="2026-01-01T00:00:10Z",
        max_points=None,
    )
    sql, params = rec.calls[0]
    assert "ORDER BY produced_at ASC" in sql
    assert "argMin" not in sql
    assert "bucket" not in params


# ---------------------------------------------------------------------------
# Pivot -> per-signal DataFrames
# ---------------------------------------------------------------------------


def test_query_signals_returns_one_frame_per_present_signal(monkeypatch):
    df = _rows(
        [
            (datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc), "a", 1.0),
            (datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc), "b", 10.0),
            (datetime(2026, 1, 1, 0, 0, 1, tzinfo=timezone.utc), "a", 2.0),
        ]
    )
    _install(monkeypatch, df)
    frames = query_signals(
        "veh-1", ["a", "b"], start="2026-01-01T00:00:00Z",
        end="2026-01-01T00:00:10Z", max_points=100,
    )
    assert len(frames) == 2
    assert list(frames[0].columns) == ["produced_at", "a"]
    assert frames[0]["a"].tolist() == [1.0, 2.0]
    assert frames[1]["b"].tolist() == [10.0]


# ---------------------------------------------------------------------------
# merge_asof — nearest within tolerance (the XY-scatter alignment contract)
# ---------------------------------------------------------------------------


def _series(times_ms, values, col):
    base = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return pd.DataFrame(
        {
            "produced_at": [base + pd.Timedelta(milliseconds=t) for t in times_ms],
            col: values,
        }
    )


def test_merge_asof_aligns_nearest_within_tolerance():
    # anchor (smallest) is `a` at t=0,200ms. `b` at t=20,180ms is within 50ms of
    # each anchor row, so each anchor row pulls the nearest b value.
    a = _series([0, 200], [1.0, 2.0], "a")
    b = _series([20, 180], [10.0, 20.0], "b")
    merged, meta = merge_signals(a, b, strategy="smallest", tolerance=50)
    assert merged["produced_at"].tolist() == a["produced_at"].tolist()
    assert merged["a"].tolist() == [1.0, 2.0]
    assert merged["b"].tolist() == [10.0, 20.0]
    assert meta.num_rows == 2


def test_merge_asof_drops_match_outside_tolerance():
    # b's only sample is 500ms from the anchor row, beyond the 50ms tolerance,
    # so the merged b value is NaN -> coerced to 0 only under fill; with
    # fill="none" it stays NaN.
    a = _series([0], [1.0], "a")
    b = _series([500], [10.0], "b")
    merged, _ = merge_signals(a, b, strategy="smallest", tolerance=50, fill="none")
    assert merged["a"].tolist() == [1.0]
    assert pd.isna(merged["b"].iloc[0])
