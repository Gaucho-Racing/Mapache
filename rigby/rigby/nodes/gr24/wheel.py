

class Wheel:
    suspension: int
    wheel_speed: int
    tire_pressure: int
    imu_accel_x: int
    imu_accel_y: int
    imu_accel_z: int
    imu_gyro_x: int
    imu_gyro_y: int
    imu_gyro_z: int
    brake_temp_one: int
    brake_temp_two: int
    brake_temp_three: int
    brake_temp_four: int
    brake_temp_five: int
    brake_temp_six: int
    brake_temp_seven: int
    brake_temp_eight: int
    tire_temp_one: int
    tire_temp_two: int
    tire_temp_three: int
    tire_temp_four: int
    tire_temp_five: int
    tire_temp_six: int
    tire_temp_seven: int
    tire_temp_eight: int

    @classmethod
    def toBytes(cls):
        pass