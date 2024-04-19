import pytest
from rigby.nodes.gr24.pedal import Pedal

def test_generate():
    pedal = Pedal()
    pedal.generate()
    assert pedal.APPS1 >= 0 and pedal.APPS1 <= 100
    assert pedal.APPS2 >= 0 and pedal.APPS2 <= 100
    assert pedal.brake_pressure_front >= 0 and pedal.brake_pressure_front <= 256
    assert pedal.brake_pressure_rear >= 0 and pedal.brake_pressure_rear <= 256

def test_to_bytes():
    pedal = Pedal()
    pedal.APPS1 = 100
    pedal.APPS2 = 50
    pedal.brake_pressure_front = 200
    pedal.brake_pressure_rear = 300
    assert pedal.to_bytes() == bytearray(b'\x00d\x002\x00\xc8\x01,')