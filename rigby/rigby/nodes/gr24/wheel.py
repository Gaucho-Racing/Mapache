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
        self.wheel_speed = Valgen.smart_rand(0, 100, self.wheel_speed, 10)
        self.tire_pressure = Valgen.smart_rand(20, 40, self.tire_pressure, 2)
        self.imu_accel = [Valgen.smart_rand(-32768, 32767, self.imu_accel[i], 100) for i in range(3)]
        self.imu_gyro = [Valgen.smart_rand(-32768, 32767, self.imu_gyro[i], 100) for i in range(3)]
        self.brake_temp = [Valgen.smart_rand(0, 255, self.brake_temp[i], 100) for i in range(8)]
        self.tire_temp = [Valgen.smart_rand(0, 255, self.tire_temp[i], 100) for i in range(8)]

    def test_generate(self):
        self.suspension = 128
        self.wheel_speed = 50
        self.tire_pressure = 30
        self.imu_accel = [-23952, 32199, 0]
        self.imu_gyro = [32199, 963, -19249]
        self.brake_temp = [100, 100, 100, 100, 100, 100, 100, 100]
        self.tire_temp = [100, 100, 100, 100, 100, 100, 100, 100]

    def to_bytes(self):
        bytes = BinFactory.uint_to_bin(self.suspension, 1)
        bytes += BinFactory.uint_to_bin(self.wheel_speed, 2)
        bytes += BinFactory.uint_to_bin(self.tire_pressure, 1)
        bytes += BinFactory.fill_bytes(4)
        for i in range(3):
            bytes += BinFactory.int_to_bin(self.imu_accel[i], 2)
        bytes += BinFactory.fill_bytes(2)
        for i in range(3):
            bytes += BinFactory.int_to_bin(self.imu_gyro[i], 2)
        bytes += BinFactory.fill_bytes(2)
        for i in range(8):
            bytes += BinFactory.uint_to_bin(self.brake_temp[i], 1)
        for i in range(8):
            bytes += BinFactory.uint_to_bin(self.tire_temp[i], 1)
        # return BinFactory.bin_to_byte_array(bytes)
        return bytes