import pytest
from rigby.nodes.gr24.pedal import Pedal

def test_generate():
    pedal = Pedal()
    pedal.generate()
    assert pedal.APPS1 >= 44256 and pedal.APPS1 <= 50100
    assert pedal.APPS2 >= 38750 and pedal.APPS2 <= 41810

def test_test_generate():
    pedal = Pedal()
    pedal.test_generate()
    assert pedal.APPS1 == 44956
    assert pedal.APPS2 == 38950
    assert pedal.millis == 12838

def test_to_bytes():
    pedal = Pedal()
    pedal.APPS1 = 100
    pedal.APPS2 = 50
    assert pedal.to_bytes() == bytearray(b'\x00d\x002\x00\x00\x00\x00')