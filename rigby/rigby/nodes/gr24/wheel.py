import numpy as np
from .data_node import data_node

class Wheel(data_node):
    suspension: int
    wheel_speed: int
    tire_pressure: int
    imu_accel: list[int]
    imu_gyro: list[int]
    brake_temp: list[int]
    tire_temp: list[int]

    @classmethod
    def generate_bytes(cls):
        init_list = [
            cls.suspension,
            *([0] * 2), #cls.to_bytes(cls.wheel_speed, 2),
            cls.tire_pressure,
            *([0] * 4),
            *[element for row in [cls.to_bytes(cls.imu_accel[i], 2) for i in range(3)] for element in row],
            *([0] * 2),
            *[element for row in [cls.to_bytes(cls.imu_gyro[i], 2) for i in range(3)] for element in row],
            *([0] * 2),
            *cls.brake_temp,
            *cls.tire_temp
        ]
        return bytes(init_list)

    @classmethod
    def decode_byte_array(cls, byte_list): #solely for testing purposes
        cls.suspension = byte_list[0]
        cls.wheel_speed = cls.to_dec(byte_list[1:3], 2)
        cls.tire_pressure = byte_list[3]
        #cls.imu_accel = [*cls.to_dec(byte_list[8:14], 2)]
        #cls.imu_gyro = [*cls.to_dec(byte_list[16:22], 2)]
        cls.imu_accel = [
            cls.to_dec(byte_list[8:10], 2),
            cls.to_dec(byte_list[10:12], 2),
            cls.to_dec(byte_list[12:14], 2)
            ]
        cls.imu_gyro = [
            cls.to_dec(byte_list[16:18], 2),
            cls.to_dec(byte_list[18:20], 2),
            cls.to_dec(byte_list[20:22], 2)
            ]
        cls.brake_temp = byte_list[24:32]
        cls.tire_temp = byte_list[32:40]
    
    @classmethod
    def gen_random_values(cls):
        cls.suspension = np.random.randint(0, 99)
        cls.wheel_speed = 0
        cls.tire_pressure = np.random.randint(20, 40)
        cls.imu_accel = np.random.randint(-32767, 32768, size=3).tolist()
        cls.imu_gyro = np.random.randint(-32767, 32768, size=3).tolist()
        cls.brake_temp = np.random.randint(0, 256, size=8).tolist()
        cls.tire_temp = np.random.randint(0, 256, size=8).tolist()

class Central_Imu:
    Accel : list[int] #x, y, z
    Gyro : list[int] #x, y, i
    #i : int?
    Mag : list[int] #x, y, z

    @classmethod
    def generate_random_values(cls):
        cls.Accel = np.random.randint(-32767, 32768, size=3).tolist()
        cls.Gyro = np.random.randint(-32767, 32768, size=3).tolist()
        cls.Mag = np.random.randint(-32767, 32768, size=3).tolist()
    
    @classmethod
    def generate_bytes(cls):
        init_list = [
            #3x8 accel, gyro mag
            *[element for row in [cls.to_bytes(cls.Accel[i], 2) for i in range(3)] for element in row],
            *[element for row in [cls.to_bytes(cls.Gyro[i], 2) for i in range(3)] for element in row],
            *[element for row in [cls.to_bytes(cls.Mag[i], 2) for i in range(3)] for element in row]
        ]
        return bytes(init_list) #byte rep of list of single byte int reps