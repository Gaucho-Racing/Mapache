import numpy as np
from .data_node import DataNode

'''
Suspension	Wheelspeed		Tire Pressure				
IMU Accel X		IMU Accel Y		IMU Accel Z			
IMU Gyro X		IMU Gyro Y		IMU Gyro Z		

Brake Temp 1	Brake Temp 2	Brake Temp 3	Brake Temp 4	Brake Temp 5	Brake Temp 6	Brake Temp 7	Brake Temp 8

Tire Temp 1	Tire Temp 2	Tire Temp 3	Tire Temp 4	Tire Temp 5	Tire Temp 6	Tire Temp 7	Tire Temp 8

'''
class Wheel(DataNode):
    suspension: int
    wheel_speed: int
    tire_pressure: int
    imu_accel: list[int]
    imu_gyro: list[int]
    brake_temp: list[int]
    tire_temp: list[int]

    @classmethod
    def generate_bytes(cls):
        print(cls.suspension)

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
        cls.suspension = np.random.randint(0, 256)
        cls.wheel_speed = np.random.randint(0, 65535)
        cls.tire_pressure = np.random.randint(0, 256)
        cls.imu_accel = np.random.randint(-32768, 32768, size=3).tolist()
        cls.imu_gyro = np.random.randint(-32768, 32768, size=3).tolist()
        cls.brake_temp = np.random.randint(0, 256, size=8).tolist()
        cls.tire_temp = np.random.randint(0, 256, size=8).tolist()

