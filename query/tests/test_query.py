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
    print(result)
    assert len(result) == 2
    for i in range(len(result)):
        assert isinstance(result[i], pd.DataFrame)
        assert list(result[i].columns) == ['produced_at', two_signals[i]]

    assert len(result[0]) == 234980
    assert len(result[1]) == 234993

# ======== 5 SIGNAL TESTS ========

# ======== 20 SIGNAL TESTS ========