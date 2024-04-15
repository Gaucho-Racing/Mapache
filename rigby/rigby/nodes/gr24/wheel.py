import numpy as np
from ...utils.binary import BinFactory
from ...utils.generator import Valgen

class Wheel:
    suspension: int
    wheel_speed: int
    tire_pressure: int
    imu_accel: list[int]
    imu_gyro: list[int]
    brake_temp: list[int]
    tire_temp: list[int]

    def __init__(self):
        self.suspension = 0
        self.wheel_speed = 0
        self.tire_pressure = 0
        self.imu_accel = [0, 0, 0]
        self.imu_gyro = [0, 0, 0]
        self.brake_temp = [0, 0, 0, 0, 0, 0, 0, 0]
        self.tire_temp = [0, 0, 0, 0, 0, 0, 0, 0]
    
    def generate(self):
        self.suspension = Valgen.smart_rand(0, 255, self.suspension, 10, 0.6)
        self.wheel_speed = np.random.randint(0, 99)
        self.tire_pressure = np.random.randint(20, 40)
        self.imu_accel = [np.random.randint(-32768, 32767) for _ in range(3)]
        self.imu_gyro = [np.random.randint(-32768, 32767) for _ in range(3)]
        self.brake_temp = [np.random.randint(0, 99) for _ in range(8)]
        self.tire_temp = [np.random.randint(0, 99) for _ in range(8)]
