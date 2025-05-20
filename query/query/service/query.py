from functools import reduce

from loguru import logger
from query.database.connection import get_db
from query.model import *
import pandas as pd
import numpy as np
from sqlalchemy import text
from typing import List
from query.model.query import Metadata

def query_signals(vehicle_id: str, signals: list, start: str = None, end: str = None) -> list[pd.DataFrame]:
    """
    Retrieves signal data within a specified time range.
    
    Parameters:
    -----------
    vehicle_id : str
        The vehicle ID to query.
    signals : list or str
        The signal(s) to query. Can be a single signal name (str) or a list of signal names.
    start : datetime or str
        The start time of the query range. If str, should be in a standard datetime format.
    end : datetime or str
        The end time of the query range. If str, should be in a standard datetime format.
        
    Returns:
    --------
    list[pd.DataFrame]
        A list of pandas dataframes each with two columns: produced_at, {signal}.
    """

    if not vehicle_id:
        raise ValueError("Vehicle ID is required")

    signals_str = "('" + "', '".join(signals) + "')"
    query = f"""
    SELECT produced_at, `name`, `value`
    FROM `signal`
    WHERE `name` IN {signals_str} AND `vehicle_id` = '{vehicle_id}'"""

    if start is not None:
        query += f" AND produced_at > '{start}'"
    if end is not None:
        query += f" AND produced_at < '{end}'"
    
    query += " ORDER BY produced_at ASC"
    logger.info(f"Query: {query}")

    with get_db() as db:
        result = pd.read_sql(query, db.bind)
        return [
            result[result['name'] == signal][['produced_at', 'value']]
            .rename(columns={'value': signal})
            .reset_index(drop=True)
            for signal in signals
        ]

def merge_to_smallest(*dfs: pd.DataFrame, tolerance: int = 50, fill: str = "none") -> tuple[pd.DataFrame, Metadata]:
    """
    Merges multiple DataFrames to the smallest one using asof merge.
    
    Parameters:
    -----------
    *dfs : pd.DataFrame
        Variable number of DataFrames, each with 'produced_at' and one signal column
    tolerance : int
        The tolerance for the merge operation in milliseconds, default is 50ms
    fill : str
        The fill value for the remaining NaNs after the merge operation, default is "none"
    Returns:
    --------
    Tuple[pd.DataFrame, Metadata]
        - DataFrame with merged signals aligned to shortest timeline
        - Metadata object containing information about the merge operation
    """
    if not dfs:
        raise ValueError("At least one DataFrame must be provided")
    
    metadata = Metadata()
    smallest = min(dfs, key=len)
    merged_df = smallest.copy()
    merged_df["produced_at"] = pd.to_datetime(merged_df["produced_at"])
    merged_df = merged_df.sort_values("produced_at")

    # Create a map of signal names and their lengths
    initial_signal_lengths = {
        df.columns[1]: len(df) for df in dfs
    }

    for df in dfs:
        if df.equals(smallest):
            continue
        df["produced_at"] = pd.to_datetime(df["produced_at"])
        df = df.sort_values("produced_at")
        merged_df = pd.merge_asof(merged_df, df, on='produced_at', direction='nearest', tolerance=pd.Timedelta(milliseconds=tolerance))

    merged_df = merged_df.sort_values(by='produced_at')
    merged_df = merged_df.reset_index(drop=True)

    signal_length_deltas = {
        signal: len(merged_df) - initial_signal_lengths[signal] for signal in initial_signal_lengths
    }

    metadata.num_rows = len(merged_df)
    metadata.merge_strategy = f"smallest_{fill}"
    metadata.merge_tolerance = tolerance
    metadata.num_signals = len(merged_df.columns) - 1
    metadata.signal_names = merged_df.columns[1:].tolist()

    metadata.start_time = merged_df["produced_at"].min()
    metadata.end_time = merged_df["produced_at"].max()
    metadata.total_duration = (metadata.end_time - metadata.start_time).total_seconds() * 1000

    # Calculate gaps between consecutive timestamps
    time_diffs = merged_df['produced_at'].diff().dropna()
    metadata.max_gap_duration = time_diffs.max().total_seconds() * 1000
    metadata.min_gap_duration = time_diffs.min().total_seconds() * 1000
    metadata.avg_gap_duration = time_diffs.mean().total_seconds() * 1000
    
    # Calculate NaN counts for each signal
    nan_counts = merged_df.drop('produced_at', axis=1).isna().sum()
    metadata.max_nan_count = nan_counts.max()
    metadata.min_nan_count = nan_counts.min()
    metadata.avg_nan_count = nan_counts.mean()

    # After nan counts, fill if needed
    if fill == "none":
        pass
    elif fill == "forward":
        merged_df = merged_df.ffill()
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    elif fill == "backward":
        merged_df = merged_df.bfill()
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    elif fill == "linear":
        merged_df = merged_df.interpolate(method="linear")
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    elif fill == "time":
        merged_df = merged_df.set_index('produced_at')
        merged_df = merged_df.interpolate(method='time')
        merged_df = merged_df.reset_index()
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    else:
        raise ValueError(f"Invalid fill value: {fill}")

    metadata.max_row_delta = max(signal_length_deltas.values())
    metadata.min_row_delta = min(signal_length_deltas.values())
    metadata.avg_row_delta = sum(signal_length_deltas.values()) / len(signal_length_deltas)

    return merged_df, metadata

def merge_to_largest(*dfs: pd.DataFrame, tolerance: int = 50, fill: str = "none") -> tuple[pd.DataFrame, Metadata]:
    """
    Merges multiple DataFrames to the largest one using asof merge.
    
    Parameters:
    -----------
    *dfs : pd.DataFrame
        Variable number of DataFrames, each with 'produced_at' and one signal column
    tolerance : int
        The tolerance for the merge operation in milliseconds, default is 50ms
    fill : str
        The fill value for the remaining NaNs after the merge operation, default is "none"
    Returns:
    --------
    Tuple[pd.DataFrame, Metadata]
        - DataFrame with merged signals aligned to shortest timeline
        - Metadata object containing information about the merge operation
    """
    if not dfs:
        raise ValueError("At least one DataFrame must be provided")
    
    metadata = Metadata()
    largest = max(dfs, key=len)
    merged_df = largest.copy()
    merged_df["produced_at"] = pd.to_datetime(merged_df["produced_at"])
    merged_df = merged_df.sort_values("produced_at")

    # Create a map of signal names and their lengths
    initial_signal_lengths = {
        df.columns[1]: len(df) for df in dfs
    }

    for df in dfs:
        if df.equals(largest):
            continue
        df["produced_at"] = pd.to_datetime(df["produced_at"])
        df = df.sort_values("produced_at")
        merged_df = pd.merge_asof(merged_df, df, on='produced_at', direction='nearest', tolerance=pd.Timedelta(milliseconds=tolerance))

    merged_df = merged_df.sort_values(by='produced_at')
    merged_df = merged_df.reset_index(drop=True)

    signal_length_deltas = {
        signal: len(merged_df) - initial_signal_lengths[signal] for signal in initial_signal_lengths
    }

    metadata.num_rows = len(merged_df)
    metadata.merge_strategy = f"largest_{fill}"
    metadata.merge_tolerance = tolerance
    metadata.num_signals = len(merged_df.columns) - 1
    metadata.signal_names = merged_df.columns[1:].tolist()

    metadata.start_time = merged_df["produced_at"].min()
    metadata.end_time = merged_df["produced_at"].max()
    metadata.total_duration = (metadata.end_time - metadata.start_time).total_seconds() * 1000

    # Calculate gaps between consecutive timestamps
    time_diffs = merged_df['produced_at'].diff().dropna()
    metadata.max_gap_duration = time_diffs.max().total_seconds() * 1000
    metadata.min_gap_duration = time_diffs.min().total_seconds() * 1000
    metadata.avg_gap_duration = time_diffs.mean().total_seconds() * 1000
    
    # Calculate NaN counts for each signal
    nan_counts = merged_df.drop('produced_at', axis=1).isna().sum()
    metadata.max_nan_count = nan_counts.max()
    metadata.min_nan_count = nan_counts.min()
    metadata.avg_nan_count = nan_counts.mean()

    # After nan counts, fill if needed
    if fill == "none":
        pass
    elif fill == "forward":
        merged_df = merged_df.ffill()
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    elif fill == "backward":
        merged_df = merged_df.bfill()
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    elif fill == "linear":
        merged_df = merged_df.interpolate(method="linear")
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    elif fill == "time":
        merged_df = merged_df.set_index('produced_at')
        merged_df = merged_df.interpolate(method='time')
        merged_df = merged_df.reset_index()
        # Fill any remaining NaN values with 0
        merged_df = merged_df.fillna(0)
    else:
        raise ValueError(f"Invalid fill value: {fill}")

    metadata.max_row_delta = max(signal_length_deltas.values())
    metadata.min_row_delta = min(signal_length_deltas.values())
    metadata.avg_row_delta = sum(signal_length_deltas.values()) / len(signal_length_deltas)

    return merged_df, metadata