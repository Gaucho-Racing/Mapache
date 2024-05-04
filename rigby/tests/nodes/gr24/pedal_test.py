import pytest
from rigby.nodes.gr24.pedal import Pedal

def test_generate():
    pedal = Pedal()
    pedal.generate()
    assert pedal.APPS1 >= 44256 and pedal.APPS1 <= 50100
    assert pedal.APPS2 >= 38750 and pedal.APPS2 <= 41810
    assert pedal.brake_pressure_front >= 0 and pedal.brake_pressure_front <= 256
    assert pedal.brake_pressure_rear >= 0 and pedal.brake_pressure_rear <= 256

def test_test_generate():
    pedal = Pedal()
    pedal.test_generate()
    assert pedal.millis == 12838
    assert pedal.APPS1 == 44956
    assert pedal.APPS2 == 38950
    assert pedal.brake_pressure_front == 188
    assert pedal.brake_pressure_rear == 120

def test_to_bytes():
    pedal = Pedal()
    pedal.APPS1 = 100
    pedal.APPS2 = 50
    pedal.brake_pressure_front = 200
    pedal.brake_pressure_rear = 300
    assert pedal.to_bytes() == bytearray(b'\x00d\x002\x00\xc8\x01,\x00\x00\x00\x00\x00\x00\x00\x00')