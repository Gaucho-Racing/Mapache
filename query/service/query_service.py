from db.connection import run_query
from model.model import *
import pandas as pd
import numpy as np

class error: # need to define errors for debugging
    def __str__(self):
        return "Some Error"

def query_trip(trip_id, lap_num=None): # lap not incorperated yet
    err = None
    query = f"""
SELECT start, end FROM trips
WHERE id = {trip_id}
"""
    try:
        result = run_query(query)
        if len(result) != 1:
            err = error()
        return err, result['start'], result['end']
    except:
        err = error()
    
    return err, None, None

def query_signals(signals, start, end): # returns a dictionary of signal values
    signals_str = "('" + "', '".join(signals) + "')"
    query = f"""
SELECT produced_at, `name`, `value` 
FROM `signal`
WHERE produced_at > '{start}' 
    AND produced_at < '{end}'
    AND `name` IN {signals_str};"""
    df = run_query(query)
    return df.groupby('name').apply(lambda g: [g['produced_at'].tolist(), g['value'].tolist()]).to_dict()

def sync_signals(signals_dict): # needs to also return meta data relating to how much data was cut
    key = min(signals_dict, key=lambda k: len(signals_dict[k][0]))
    key_df = pd.DataFrame()
    key_df['produced_at'], key_df[key] = signals_dict[key][0], signals_dict[key][1]
    A = np.array(signals_dict[key][0])
    for signal in signals_dict:
        if signal == key:
            continue
        B = np.array(signals_dict[signal][0])
        indices = np.argmin(abs(B[:, np.newaxis] - A), axis=0)
        key_df[signal] = np.array(signals_dict[signal][1])[indices]
    return key_df

def populate_signals(vid, signals, start, end):
    list_of_signals = sync_signals(query_signals(signals, start, end))
    return Data(data=[DataInstance(**row.to_dict()) for _, row in list_of_signals.iterrows()])