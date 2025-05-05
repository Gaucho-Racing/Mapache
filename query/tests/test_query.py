import pytest
import pandas as pd
from datetime import datetime
from query.service.query import query_signals
from query.database.connection import init_db

# ======== SINGLE SIGNAL TESTS ========

def test_query_signals_single_signal():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=['vdm_speed'])
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 234980

def test_query_signals_start_time():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=['vdm_speed'], start='2024-11-09 22:53:55.00')
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 135540

def test_query_signals_end_time():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=['vdm_speed'], end='2024-11-09 22:57:41.00')
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 101786

def test_query_signals_start_end_time():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=['vdm_speed'], start='2024-11-09 22:53:55.00', end='2024-11-09 22:57:41.00')
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 2346

def test_query_signals_invalid_vehicle_id():
    init_db()
    result = query_signals(vehicle_id='invalid', signals=['vdm_speed'])
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 0

def test_query_signals_invalid_range():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=['vdm_speed'], start='2022-11-09 22:53:55.00', end='2022-11-09 22:57:41.00')
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 0

# ======== 2 SIGNAL TESTS ========

two_signals = ['vdm_speed', 'inverter_erpm']
expected_columns = ['produced_at'] + two_signals

def test_query_signals_two_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=two_signals)
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]

    assert len(result[0]) == 234980
    assert len(result[1]) == 234993

def test_query_signals_start_time_two_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=two_signals, start='2024-11-09 22:53:55.00')
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]
    assert len(result[0]) == 135540
    assert len(result[1]) == 135548
    
def test_query_signals_end_time_two_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=two_signals, end='2024-11-09 22:57:41.00')
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]
    assert len(result[0]) == 101786
    assert len(result[1]) == 101791

def test_query_signals_start_end_time_two_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=two_signals, start='2024-11-09 22:53:55.00', end='2024-11-09 22:57:41.00')
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]
    assert len(result[0]) == 2346
    assert len(result[1]) == 2346

def test_query_signals_invalid_vehicle_id_two_signals():
    init_db()
    result = query_signals(vehicle_id='invalid', signals=two_signals)
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]
    assert len(result[0]) == 0
    assert len(result[1]) == 0

def test_query_signals_invalid_range_two_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=two_signals, start='2022-11-09 22:53:55.00', end='2022-11-09 22:57:41.00')
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]
    assert len(result[0]) == 0
    assert len(result[1]) == 0

# ======== 5 SIGNAL TESTS ========

five_signals = ['vdm_speed', 'inverter_erpm', 'acu_cell34_voltage', 'pedal_apps_one', 'mobile_accelerometer_x']
expected_columns = ['produced_at'] + five_signals

def test_query_signals_five_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=five_signals)
    assert len(result) == 5
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', five_signals[i]]

    assert len(result[0]) == 234980
    assert len(result[1]) == 234993
    assert len(result[2]) == 234964
    assert len(result[3]) == 234969
    assert len(result[4]) == 205006

def test_query_signals_start_time_five_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=five_signals, start='2024-11-09 22:53:55.00')
    assert len(result) == 5
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', five_signals[i]]
    assert len(result[0]) == 135540
    assert len(result[1]) == 135548
    assert len(result[2]) == 135532
    assert len(result[3]) == 135527
    assert len(result[4]) == 171590
    
def test_query_signals_end_time_five_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=five_signals, end='2024-11-09 22:57:41.00')
    assert len(result) == 5
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', five_signals[i]]
    assert len(result[0]) == 101786
    assert len(result[1]) == 101791
    assert len(result[2]) == 101778
    assert len(result[3]) == 101788
    assert len(result[4]) == 34544

def test_query_signals_start_end_time_five_signals():
    init_db()
    result = query_signals(vehicle_id='gr24', signals=five_signals, start='2024-11-09 22:53:55.00', end='2024-11-09 22:57:41.00')
    assert len(result) == 5
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', five_signals[i]]
    assert len(result[0]) == 2346
    assert len(result[1]) == 2346
    assert len(result[2]) == 2346
    assert len(result[3]) == 2346
    assert len(result[4]) == 1128

# ======== 20 SIGNAL TESTS ========