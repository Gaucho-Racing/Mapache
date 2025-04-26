from functools import reduce
from query.database.connection import get_db
from query.model import *
import pandas as pd
import numpy as np
from sqlalchemy import text
from typing import List
from query.model.query import DataInstance

def query_signals(signals: list, start: str = None, end: str = None) -> list[pd.DataFrame]:
    """
    Retrieves signal data within a specified time range.
    
    Parameters:
    -----------
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
    signals_str = "('" + "', '".join(signals) + "')"
    query = f"""
    SELECT produced_at, `name`, `value` 
    FROM `signal`
    WHERE `name` IN {signals_str}
    ORDER BY produced_at ASC"""

    if start is not None:
        query += f" AND produced_at > '{start}'"
    if end is not None:
        query += f" AND produced_at < '{end}'"

    db = get_db()
    result = pd.read_sql(query, db.bind)
    return [
        result[result['name'] == signal][['produced_at', 'value']]
        .rename(columns={'value': signal})
        .reset_index(drop=True)
        for signal in signals
    ]

def merge_to_smallest(*dfs: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Merges multiple DataFrames to the smallest one using asof merge.
    
    Parameters:
    -----------
    *dfs : pd.DataFrame
        Variable number of DataFrames, each with 'produced_at' and one signal column
        
    Returns:
    --------
    Tuple[pd.DataFrame, np.ndarray]
        - DataFrame with merged signals aligned to shortest timeline
        - Array of data points lost for each signal (compared to smallest)
    """
    smallest = min(dfs, key=len)
    key = smallest.copy()
    loss = []

    for df in dfs:
        loss.append(len(df)) # keep track of data length
        if df.equals(smallest):
            continue
        key = pd.merge_asof(key, df, on='produced_at')
    
    nrows = len(smallest)
    loss = np.array(loss)
    loss -= nrows #compute the amount of truncated rows

    return key, loss, nrows

def df_to_pydantic(df: pd.DataFrame) -> List[DataInstance]:
    """
    Converts a pandas DataFrame into a list of Data objects containing DataInstance objects.
    Each row in the DataFrame becomes a separate DataInstance.
    
    Parameters:
    -----------
    df : pd.DataFrame
        DataFrame containing signal data with 'produced_at' and signal columns
        
    Returns:
    --------
    Data
        A single Data object with all rows converted to DataInstances
    """
    data_instances = [
        DataInstance(**row.to_dict()) 
        for _, row in df.iterrows()
    ]
    
    return data_instances

# <------------- query functions ------------->

def query_signal(vehicle_id: str, signal_name: str, start_time: str, end_time: str) -> pd.DataFrame:
    query = f"""
    SELECT produced_at, `value` FROM `signal`
    WHERE `name` = '{signal_name}'
    AND `vehicle_id` = '{vehicle_id}'
    AND produced_at > '{start_time}'
    AND produced_at < '{end_time}'
    ORDER BY produced_at
    """
    db = get_db()
    result = pd.read_sql(query, db.bind)
    result = result.rename(columns={'value': signal_name})
    return result

def analyze_signal_df(df: pd.DataFrame):
    if 'produced_at' not in df.columns:
        raise ValueError("DataFrame must contain 'produced_at' column")
    if len(df) < 2:
        return None
    
    # Convert to datetime if not already
    df['produced_at'] = pd.to_datetime(df['produced_at'])
    
    # Calculate differences between consecutive timestamps
    time_diffs = df['produced_at'].diff().dropna()
    
    # Calculate total duration and resolution
    total_duration = (df['produced_at'].max() - df['produced_at'].min()).total_seconds()
    resolution = total_duration / (len(df) - 1) if len(df) > 1 else pd.NaT

    print(f"Total duration: {total_duration} ({df['produced_at'].min()} - {df['produced_at'].max()})")
    print(f"Number of rows: {len(df)}")
    print(f"Resolution: {resolution}")
    
    # Find indices of min and max time differences
    min_idx = time_diffs.idxmin()
    max_idx = time_diffs.idxmax()
    
    print(f"Minimum time difference: {time_diffs.min().total_seconds()} seconds")
    print(f"  Between rows {min_idx-1} and {min_idx}")
    print(f"  Times: {df['produced_at'].iloc[min_idx-1]} - {df['produced_at'].iloc[min_idx]}")
    
    print(f"Maximum time difference: {time_diffs.max().total_seconds()} seconds") 
    print(f"  Between rows {max_idx-1} and {max_idx}")
    print(f"  Times: {df['produced_at'].iloc[max_idx-1]} - {df['produced_at'].iloc[max_idx]}")
    
    print(f"Average time difference: {time_diffs.mean().total_seconds()} seconds")

def raw_merge_df(*dfs: pd.DataFrame):
    """
    Merges multiple DataFrames on the 'produced_at' column using an outer join.
    
    Parameters:
        dfs (list of pd.DataFrame): A variable number of DataFrames to merge.

    Returns:
        pd.DataFrame: A merged DataFrame containing all timestamps from all inputs.
    """
    if not dfs:
        raise ValueError("At least one DataFrame must be provided")

    merged_df = reduce(lambda left, right: pd.merge(left, right, on='produced_at', how='outer'), dfs)

    # Sort by produced_at
    merged_df = merged_df.sort_values(by='produced_at')
    merged_df = merged_df.reset_index(drop=True)

    # Count NaN values in each column (excluding produced_at)
    nan_counts = merged_df.drop('produced_at', axis=1).isna().sum()
    #print("\nNaN counts per column:")
    #print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    #print(f"\nTotal NaN values across all columns: {total_nans}")

    nrows = len(merged_df)

    return merged_df, nan_counts, total_nans, nrows

def merge_to_largest(*dfs: pd.DataFrame):
    """
    Merges all DataFrames onto the one with the most rows using closest matching produced_at timestamps.
    Optionally exports the result to a CSV file.
    
    Parameters:
        dfs (list of pd.DataFrame): List of DataFrames to merge.
        output_path (str, optional): Path to save the CSV file. If None, no file is saved.
        
    Returns:
        pd.DataFrame: A merged DataFrame with all values aligned to the largest DataFrame.
    """
    if not dfs:
        raise ValueError("At least one DataFrame must be provided")
    
    tolerance = pd.Timedelta("50ms")

    # Identify the DataFrame with the most rows
    main_df = max(dfs, key=len)

    merged_df = main_df.copy()

    # Ensure produced_at is a datetime column
    merged_df["produced_at"] = pd.to_datetime(merged_df["produced_at"])

    # Sort the main DataFrame by time
    merged_df = merged_df.sort_values("produced_at")

    # Merge all other DataFrames using asof join
    for df in dfs:
        if df.equals(main_df):
            continue  # Skip merging the main dataframe with itself
        
        df["produced_at"] = pd.to_datetime(df["produced_at"])
        df = df.sort_values("produced_at")  # Sort for merge_asof

        # Merge using closest timestamps
        merged_df = pd.merge_asof(
            merged_df, df, on="produced_at", direction="nearest", tolerance=tolerance
        )

    # Sort by produced_at
    merged_df = merged_df.sort_values(by='produced_at')
    merged_df = merged_df.reset_index(drop=True)

    # Count NaN values in each column (excluding produced_at)
    nan_counts = merged_df.drop('produced_at', axis=1).isna().sum()
    #print("\nNaN counts per column:")
    #print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    #print(f"\nTotal NaN values across all columns: {total_nans}")

    #output_path = "~/Downloads/export.csv"
    #main_df.to_csv(output_path, index=False)
    #print(f"\nData exported to: {output_path}")
    nrows = len(merged_df)
    
    return merged_df, nan_counts, total_nans, nrows

def merge_to_largest_fill(*dfs: pd.DataFrame):
    """
    Merges all DataFrames onto the one with the most rows using closest matching produced_at timestamps.
    Fills missing values with the most recent non-null value.
    Optionally exports the result to a CSV file.
    
    Parameters:
        dfs (list of pd.DataFrame): List of DataFrames to merge.
        output_path (str, optional): Path to save the CSV file. If None, no file is saved.
        
    Returns:
        pd.DataFrame: A merged DataFrame with all values aligned to the largest DataFrame.
    """
    if not dfs:
        raise ValueError("At least one DataFrame must be provided")
    
    tolerance = pd.Timedelta("50ms")

    # Identify the DataFrame with the most rows
    main_df = max(dfs, key=len)
    merged_df = main_df.copy()

    # Ensure produced_at is a datetime column
    merged_df["produced_at"] = pd.to_datetime(merged_df["produced_at"])

    # Sort the main DataFrame by time
    merged_df = merged_df.sort_values("produced_at")

    # Merge all other DataFrames using asof join
    for df in dfs:
        if df.equals(main_df):
            continue  # Skip merging the main dataframe with itself
        
        df["produced_at"] = pd.to_datetime(df["produced_at"])
        df = df.sort_values("produced_at")  # Sort for merge_asof

        # Merge using closest timestamps
        merged_df = pd.merge_asof(
            merged_df, df, on="produced_at", direction="nearest", tolerance=tolerance
        )

    # Sort by produced_at
    merged_df = merged_df.sort_values(by='produced_at')
    merged_df = merged_df.reset_index(drop=True)

    # Forward fill NaN values with most recent non-null value
    merged_df = merged_df.fillna(method='ffill')

    # Count NaN values in each column (excluding produced_at)
    nan_counts = merged_df.drop('produced_at', axis=1).isna().sum()
    #print("\nNaN counts per column after forward fill:")
    #print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    #print(f"\nTotal NaN values across all columns after forward fill: {total_nans}")

    #output_path = "~/Downloads/export.csv"
    #main_df.to_csv(output_path, index=False)
    #print(f"\nData exported to: {output_path}")

    nrows = len(merged_df)
    
    return merged_df, nan_counts, total_nans, nrows

def resample_ffill(df: pd.DataFrame, interval: str):
    if "produced_at" not in df.columns:
        raise ValueError("DataFrame must contain a 'produced_at' column")

    df = df.copy()
    df["produced_at"] = pd.to_datetime(df["produced_at"])
    
    # Ensure non-datetime columns are numeric (replace NaT with NaN)
    for col in df.select_dtypes(include=["object", "datetime64[ns]"]):
        df[col] = pd.to_numeric(df[col], errors='coerce')  # Converts non-numeric values to NaN

    df.set_index("produced_at", inplace=True)

    resampled = df.resample(interval).ffill().bfill().reset_index()
    resampled = resampled.sort_values("produced_at").reset_index(drop=True)

    nan_counts = resampled.drop(columns="produced_at").isna().sum()
    total_nans = nan_counts.sum()
    nrows = len(resampled)

    return resampled, total_nans, nrows