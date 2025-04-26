import pytest
import pandas as pd
from datetime import datetime
from query.service.query import query_signals
from query.database.connection import init_db

def test_query_signals_single_signal():
    init_db()
    result = query_signals(['vdm_speed'])
    assert len(result) == 1
    assert isinstance(result[0], pd.DataFrame)
    assert list(result[0].columns) == ['produced_at', 'vdm_speed']
    assert len(result[0]) == 234980