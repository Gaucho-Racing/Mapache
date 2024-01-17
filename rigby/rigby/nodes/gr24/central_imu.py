from data_node import data_node
import numpy as np

class Central_Imu(data_node):
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
            *[0]*2,
            *[element for row in [cls.to_bytes(cls.Gyro[i], 2) for i in range(3)] for element in row],
            *[0]*2,
            *[element for row in [cls.to_bytes(cls.Mag[i], 2) for i in range(3)] for element in row]
            *[0]*2,
        ]
        return bytes(init_list) #byte rep of list of single byte int reps