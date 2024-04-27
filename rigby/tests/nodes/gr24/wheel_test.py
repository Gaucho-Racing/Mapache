import pytest
from rigby.nodes.gr24.wheel import Wheel

def test_generate():
    wheel = Wheel()
    wheel.generate()
    assert wheel.suspension >= 0 and wheel.suspension <= 255
    assert wheel.wheel_speed >= 0 and wheel.wheel_speed <= 100
    assert wheel.tire_pressure >= 20 and wheel.tire_pressure <= 40
    for i in range(3):
        assert wheel.imu_accel[i] >= -32768 and wheel.imu_accel[i] <= 32767
        assert wheel.imu_gyro[i] >= -32768 and wheel.imu_gyro[i] <= 32767
    for i in range(8):
        assert wheel.brake_temp[i] >= 0 and wheel.brake_temp[i] <= 255
        assert wheel.tire_temp[i] >= 0 and wheel.tire_temp[i] <= 255

def test_test_generate():
    wheel = Wheel()
    wheel.test_generate()
    assert wheel.suspension == 128
    assert wheel.wheel_speed == 50
    assert wheel.tire_pressure == 30
    assert wheel.imu_accel == [-23952, 32199, 0]
    assert wheel.imu_gyro == [32199, 963, -19249]
    assert wheel.brake_temp == [255, 0, 129, 41, 100, 23, 19, 199]
    assert wheel.tire_temp == [0, 255, 199, 2, 100, 43, 92, 72]

def test_to_bytes():
    wheel = Wheel()
    wheel.suspension = 128
    wheel.wheel_speed = 50
    wheel.tire_pressure = 30
    wheel.imu_accel = [-23952, 32199, 0]
    wheel.imu_gyro = [32199, 963, -19249]
    wheel.brake_temp = [255, 0, 129, 41, 100, 23, 19, 199]
    wheel.tire_temp = [0, 255, 199, 2, 100, 43, 92, 72]
    assert wheel.to_bytes() == "10000000000000000011001000011110000000000000000000000000000000001010001001110000011111011100011100000000000000000000000000000000011111011100011100000011110000111011010011001111000000000000000011111111000000001000000100101001011001000001011100010011110001110000000011111111110001110000001001100100001010110101110001001000"