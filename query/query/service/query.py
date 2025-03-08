from functools import reduce
from query.database.connection import get_db
from query.model import *
import pandas as pd
import numpy as np

# def run_query(query): #returns pandas dataframe
#     with get_db() as db:
#         return pd.read_sql(query, db)

# class error: # need to define errors for debugging
#     def __str__(self):
#         return "Some Error"

# def query_trip(trip_id, lap_num=None): # lap not incorperated yet
#     err = None
#     query = f"""
# SELECT start, end FROM trips
# WHERE id = {trip_id}
# """
#     try:
#         result = run_query(query)
#         if len(result) != 1:
#             err = error()
#         return err, result['start'], result['end']
#     except:
#         err = error()
    
#     return err, None, None

# def query_signals(signals, start, end): # returns a dictionary of signal values
#     signals_str = "('" + "', '".join(signals) + "')"
#     query = f"""
# SELECT produced_at, `name`, `value` 
# FROM `signal`
# WHERE produced_at > '{start}' 
#     AND produced_at < '{end}'
#     AND `name` IN {signals_str};"""
#     df = run_query(query)
#     return df.groupby('name').apply(lambda g: [g['produced_at'].tolist(), g['value'].tolist()]).to_dict()

# def sync_signals(signals_dict): # needs to also return meta data relating to how much data was cut
#     key = min(signals_dict, key=lambda k: len(signals_dict[k][0]))
#     key_df = pd.DataFrame()
#     key_df['produced_at'], key_df[key] = signals_dict[key][0], signals_dict[key][1]
#     A = np.array(signals_dict[key][0])
#     for signal in signals_dict:
#         if signal == key:
#             continue
#         B = np.array(signals_dict[signal][0])
#         indices = np.argmin(abs(B[:, np.newaxis] - A), axis=0)
#         key_df[signal] = np.array(signals_dict[signal][1])[indices]
#     return key_df

# def populate_signals(vid, signals, start, end):
#     list_of_signals = sync_signals(query_signals(signals, start, end))
#     return Data(data=[DataInstance(**row.to_dict()) for _, row in list_of_signals.iterrows()])

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
    print(f"Minimum time difference: {time_diffs.min().total_seconds()} seconds")
    print(f"Maximum time difference: {time_diffs.max().total_seconds()} seconds")
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
    
    Parameters:
        df_list (list of pd.DataFrame): List of DataFrames to merge.
        tolerance (pd.Timedelta): Maximum time difference allowed for merging.
        
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
    return main_df
