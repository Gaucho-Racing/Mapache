from ...utils.binary import BinFactory
from ...utils.generator import Valgen
from .wheel import Wheel

class BCM:
    wheels: list[Wheel]
    imu_accel: list[int]
    imu_gyro: list[int]
    imu_mag: list[int]

    def __init__(self):
        self.wheels = [Wheel() for _ in range(4)]
        self.imu_accel = [0, 0, 0]
        self.imu_gyro = [0, 0, 0]
        self.imu_mag = [0, 0, 0]
        
    def generate(self):
        for wheel in self.wheels:
            wheel.generate()
        self.imu_accel = [Valgen.smart_rand(-32768, 32767, self.imu_accel[i], 100) for i in range(3)]
        self.imu_gyro = [Valgen.smart_rand(-32768, 32767, self.imu_gyro[i], 100) for i in range(3)]
        self.imu_mag = [Valgen.smart_rand(-32768, 32767, self.imu_mag[i], 100) for i in range(3)]

    def test_generate(self):
        for wheel in self.wheels:
            wheel.test_generate()
        self.imu_accel = [-23952, 32199, 0]
        self.imu_gyro = [32199, 963, -19249]
        self.imu_mag = [10, 0, -19]

    def to_bytes(self):
        bytes = ""
        for wheel in self.wheels:
            bytes += wheel.to_bytes()
        for i in range(3):
            bytes += BinFactory.int_to_bin(self.imu_accel[i], 2)
        bytes += BinFactory.fill_bytes(2)
        for i in range(3):
            bytes += BinFactory.int_to_bin(self.imu_gyro[i], 2)
        bytes += BinFactory.fill_bytes(2)
        for i in range(3):
            bytes += BinFactory.int_to_bin(self.imu_mag[i], 2)
        bytes += BinFactory.fill_bytes(2)
        return BinFactory.bin_to_byte_array(bytes)