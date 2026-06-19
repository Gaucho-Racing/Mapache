"""Record-style signal querying: pull raw rows from the `signal` table, pivot
them onto a single timeline, then merge/fill for the dashboard.

This is the data path behind the track-map / calibration views and the legacy
`components/widgets/SignalWidget` chart, which read paired signal samples as a
list of `{produced_at, <name>: value, ...}` records and plot one signal against
another. Reads go through main's shared ClickHouse client (`get_clickhouse()`).

The server-side decimation (one representative per (name, time-bucket)) is shared
with the /query/signals/data path via service/decimate; only the timeline merge
differs — here it is a pandas merge_asof (nearest within tolerance), which keeps
this path on pandas/numpy.
"""

from datetime import datetime, timezone

import pandas as pd
from loguru import logger

from query.database.clickhouse import get_clickhouse
from query.model.query import Metadata
from query.service.decimate import bucket_micros, bucket_seconds, build_decimation_sql


def _parse_ts(value: str | None) -> datetime | None:
    """Parse an ISO timestamp to a naive-UTC datetime for DateTime64 binding."""
    if value is None:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def query_signals(
    vehicle_id: str,
    signals: list[str],
    start: str | None = None,
    end: str | None = None,
    max_points: int | None = None,
) -> list[pd.DataFrame]:
    if not vehicle_id:
        raise ValueError("Vehicle ID is required")

    params: dict = {"vehicle_id": vehicle_id, "signals": list(signals)}
    start_dt = _parse_ts(start)
    end_dt = _parse_ts(end)

    where = ["name IN {signals:Array(String)}", "vehicle_id = {vehicle_id:String}"]
    if start_dt is not None:
        where.append("produced_at > {start:DateTime64(6)}")
        params["start"] = start_dt
    if end_dt is not None:
        where.append("produced_at < {end:DateTime64(6)}")
        params["end"] = end_dt

    # With max_points and a bounded window, decimate in SQL (one representative
    # per (name, time-bucket)) so wide windows don't time out. Otherwise stream
    # the full-resolution rows ordered by time.
    bucket = (
        bucket_seconds(start_dt, end_dt, max_points) if max_points else None
    )
    if bucket is not None:
        params["bucket"] = bucket_micros(bucket)
        query_str = build_decimation_sql(where, "bucket")
        ts_col = "bucket_ts"
    else:
        query_str = (
            "SELECT produced_at, name, value FROM signal WHERE "
            + " AND ".join(where)
            + " ORDER BY produced_at ASC"
        )
        ts_col = "produced_at"
    logger.info(f"Query: {query_str} | Params: {params}")

    result = get_clickhouse().query_df(query_str, parameters=params)

    # Empty window → no timestamp column; bail rather than KeyError-ing.
    if result.empty or ts_col not in result.columns:
        return []

    result = result.rename(columns={ts_col: "produced_at"})
    result["produced_at"] = pd.to_datetime(result["produced_at"], utc=True)

    pivoted = result.pivot_table(index="produced_at", columns="name", values="value", aggfunc="first")
    pivoted = pivoted.reset_index().sort_values("produced_at")

    return [
        pivoted[["produced_at", signal]].dropna(subset=[signal]).reset_index(drop=True)
        for signal in signals
        if signal in pivoted.columns
    ]


def _apply_fill(df: pd.DataFrame, fill: str) -> pd.DataFrame:
    if fill == "none":
        return df
    elif fill == "forward":
        df = df.ffill()
    elif fill == "backward":
        df = df.bfill()
    elif fill == "linear":
        df = df.interpolate(method="linear")
    elif fill == "time":
        df = df.set_index("produced_at")
        df = df.interpolate(method="time")
        df = df.reset_index()
    else:
        raise ValueError(f"Invalid fill value: {fill}")
    return df.fillna(0)


def merge_signals(
    *dfs: pd.DataFrame,
    strategy: str = "smallest",
    tolerance: int = 50,
    fill: str = "none",
) -> tuple[pd.DataFrame, Metadata]:
    if not dfs:
        raise ValueError("At least one DataFrame must be provided")

    if len(dfs) == 1:
        merged_df = dfs[0].copy()
        initial_signal_lengths = {merged_df.columns[1]: len(merged_df)}
    else:
        anchor = min(dfs, key=len) if strategy == "smallest" else max(dfs, key=len)

        initial_signal_lengths = {df.columns[1]: len(df) for df in dfs}

        merged_df = anchor.copy()
        td = pd.Timedelta(milliseconds=tolerance)
        for i, df in enumerate(dfs):
            if df is anchor:
                continue
            merged_df = pd.merge_asof(
                merged_df, df, on="produced_at", direction="nearest", tolerance=td,
            )

    merged_df = merged_df.sort_values("produced_at").reset_index(drop=True)

    signal_length_deltas = {
        signal: len(merged_df) - length for signal, length in initial_signal_lengths.items()
    }

    metadata = Metadata()
    metadata.num_rows = len(merged_df)
    metadata.merge_strategy = f"{strategy}_{fill}"
    metadata.merge_tolerance = tolerance
    metadata.num_signals = len(merged_df.columns) - 1
    metadata.signal_names = merged_df.columns[1:].tolist()

    metadata.start_time = merged_df["produced_at"].min()
    metadata.end_time = merged_df["produced_at"].max()
    metadata.total_duration = (metadata.end_time - metadata.start_time).total_seconds() * 1000

    time_diffs = merged_df["produced_at"].diff().dropna()
    metadata.max_gap_duration = time_diffs.max().total_seconds() * 1000
    metadata.min_gap_duration = time_diffs.min().total_seconds() * 1000
    metadata.avg_gap_duration = time_diffs.mean().total_seconds() * 1000

    nan_counts = merged_df.drop("produced_at", axis=1).isna().sum()
    metadata.max_nan_count = nan_counts.max()
    metadata.min_nan_count = nan_counts.min()
    metadata.avg_nan_count = nan_counts.mean()

    merged_df = _apply_fill(merged_df, fill)

    metadata.max_row_delta = max(signal_length_deltas.values())
    metadata.min_row_delta = min(signal_length_deltas.values())
    metadata.avg_row_delta = sum(signal_length_deltas.values()) / len(signal_length_deltas)

    return merged_df, metadata
