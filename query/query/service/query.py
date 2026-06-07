from loguru import logger
from query.database.connection import get_client
import pandas as pd
from query.model.query import Metadata


def _bucket_seconds(start: str | None, end: str | None, max_points: int) -> float | None:
    """Bucket width (seconds) that yields at most ~`max_points` per signal over
    [start, end], or None if the window is unknown/degenerate (no decimation).
    """
    if start is None or end is None or max_points <= 0:
        return None
    try:
        span = (pd.to_datetime(end) - pd.to_datetime(start)).total_seconds()
    except (ValueError, TypeError):
        return None
    if span <= 0:
        return None
    return span / max_points


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

    # When `max_points` is set and the window is known, decimate in SQL: bucket
    # each signal's rows by time and keep one representative per bucket. This
    # caps the rows transferred + pivoted + serialized at ~max_points per signal
    # (the map doesn't need every sample), which is the main fix for the
    # raw-data timeout on wide windows. Without it the query is full-resolution.
    bucket = _bucket_seconds(start, end, max_points) if max_points else None

    # `timestamp` is the raw Int64 microsecond column; bucketing on it integer-
    # divided by the bucket width avoids EXTRACT(EPOCH ...) (not a ClickHouse
    # function) and keeps the grouping exact.
    bucket_expr = ""
    if bucket is not None:
        params["bm"] = max(int(bucket * 1_000_000), 1)
        bucket_expr = "intDiv(timestamp, {bm:UInt64})"

    where = ["name IN {signals:Array(String)}", "vehicle_id = {vehicle_id:String}"]
    if start is not None:
        where.append("produced_at > parseDateTime64BestEffort({start:String}, 6, 'UTC')")
        params["start"] = start
    if end is not None:
        where.append("produced_at < parseDateTime64BestEffort({end:String}, 6, 'UTC')")
        params["end"] = end

    query_str = (
        "SELECT produced_at, name, value FROM signal WHERE " + " AND ".join(where)
    )

    if bucket is not None:
        # ClickHouse has no DISTINCT ON. `ORDER BY name, bucket, produced_at`
        # then `LIMIT 1 BY name, bucket` keeps the earliest row per (signal,
        # time bucket) — the same "one representative per bucket" semantics.
        query_str += (
            f" ORDER BY name ASC, {bucket_expr} ASC, produced_at ASC"
            f" LIMIT 1 BY name, {bucket_expr}"
        )
    else:
        query_str += " ORDER BY produced_at ASC"
    logger.info(f"Query: {query_str} | Params: {params}")

    result = get_client().query_df(query_str, parameters=params)

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
