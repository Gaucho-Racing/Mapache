from functools import reduce
from query.database.connection import get_db
from query.model import *
import pandas as pd
import numpy as np
from query.model.exceptions import TripNotFoundError

# <------------- query functions ------------->
def query_vehicle_id(vehicle_id):
    query = f"""
    SELECT name FROM vehicle
    WHERE name = '{vehicle_id}';
    """
    db = get_db()
    result = pd.read_sql(query, db.bind)
    
    if len(result) != 1: 
        #doesnt acount for more than 1 entry!!!!
        return False
    
    return True

def query_trip(trip_id, lap_num=None): # lap not incorperated yet
    err = None
    query = f"""
    SELECT start_time, end_time FROM trip
    WHERE id = {trip_id}
    """

    db = get_db()
    result = pd.read_sql(query, db.bind)
    
    if len(result) != 1:
        raise TripNotFoundError
    
    return result['start_time'][0], result['end_time'][0] #note index zero

def query_signals(signals: list, start: str, end: str) -> list[pd.DataFrame]:
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
    WHERE produced_at > '{start}' 
    AND produced_at < '{end}'
    AND `name` IN {signals_str}
    ORDER BY produced_at ASC;"""
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
    key = smallest
    loss = []

    for df in dfs:
        loss.append(len(df)) # keep track of data length
        if df.equals(smallest):
            continue
        key = pd.merge_asof(smallest, df, on='produced_at')
    
    loss = np.array(loss)
    loss -= len(smallest) #compute the amount of truncated rows

    return key, loss

from typing import List
from query.model.query import Data, DataInstance

def df_to_json_data(df: pd.DataFrame) -> Data:
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
    print("\nNaN counts per column:")
    print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    print(f"\nTotal NaN values across all columns: {total_nans}")

    return merged_df

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

    # Ensure produced_at is a datetime column
    main_df["produced_at"] = pd.to_datetime(main_df["produced_at"])

    # Sort the main DataFrame by time
    main_df = main_df.sort_values("produced_at")

    # Merge all other DataFrames using asof join
    for df in dfs:
        if df is main_df:
            continue  # Skip merging the main dataframe with itself
        
        df["produced_at"] = pd.to_datetime(df["produced_at"])
        df = df.sort_values("produced_at")  # Sort for merge_asof

        # Merge using closest timestamps
        main_df = pd.merge_asof(
            main_df, df, on="produced_at", direction="nearest", tolerance=tolerance
        )

    # Sort by produced_at
    main_df = main_df.sort_values(by='produced_at')
    main_df = main_df.reset_index(drop=True)

    # Count NaN values in each column (excluding produced_at)
    nan_counts = main_df.drop('produced_at', axis=1).isna().sum()
    print("\nNaN counts per column:")
    print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    print(f"\nTotal NaN values across all columns: {total_nans}")

    output_path = "~/Downloads/export.csv"
    main_df.to_csv(output_path, index=False)
    print(f"\nData exported to: {output_path}")
    
    return main_df

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

    # Ensure produced_at is a datetime column
    main_df["produced_at"] = pd.to_datetime(main_df["produced_at"])

    # Sort the main DataFrame by time
    main_df = main_df.sort_values("produced_at")

    # Merge all other DataFrames using asof join
    for df in dfs:
        if df is main_df:
            continue  # Skip merging the main dataframe with itself
        
        df["produced_at"] = pd.to_datetime(df["produced_at"])
        df = df.sort_values("produced_at")  # Sort for merge_asof

        # Merge using closest timestamps
        main_df = pd.merge_asof(
            main_df, df, on="produced_at", direction="nearest", tolerance=tolerance
        )

    # Sort by produced_at
    main_df = main_df.sort_values(by='produced_at')
    main_df = main_df.reset_index(drop=True)

    # Forward fill NaN values with most recent non-null value
    main_df = main_df.fillna(method='ffill')

    # Count NaN values in each column (excluding produced_at)
    nan_counts = main_df.drop('produced_at', axis=1).isna().sum()
    print("\nNaN counts per column after forward fill:")
    print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    print(f"\nTotal NaN values across all columns after forward fill: {total_nans}")

    output_path = "~/Downloads/export.csv"
    main_df.to_csv(output_path, index=False)
    print(f"\nData exported to: {output_path}")
    
    return main_df

def resample_ffill(df: pd.DataFrame, interval: str):
    """
    Resamples a DataFrame to a given time interval using forward fill for missing values.

    Parameters:
        df (pd.DataFrame): The input DataFrame with a datetime column.
        interval (str): Resampling interval (e.g., "1T" for 1 minute, "5S" for 5 seconds).

    Returns:
        pd.DataFrame: A resampled DataFrame with forward-filled missing values.
    """
    if "produced_at" not in df.columns:
        raise ValueError("DataFrame must contain a 'produced_at' column")
    
    # Ensure 'produced_at' is a datetime column
    df["produced_at"] = pd.to_datetime(df["produced_at"])
    
    # Set produced_at as the index for resampling
    df = df.set_index("produced_at")

    # Resample with forward fill (nearest previous value)
    resampled_df = df.resample(interval).ffill()
    resampled_df = resampled_df.reset_index()

    # Sort by produced_at
    resampled_df = resampled_df.sort_values(by='produced_at')
    resampled_df = resampled_df.reset_index(drop=True)

    # Count NaN values in each column (excluding produced_at)
    nan_counts = resampled_df.drop('produced_at', axis=1).isna().sum()
    print("\nNaN counts per column after forward fill:")
    print(nan_counts)
    
    # Total NaN count
    total_nans = nan_counts.sum()
    print(f"\nTotal NaN values across all columns after forward fill: {total_nans}")

    return resampled_df