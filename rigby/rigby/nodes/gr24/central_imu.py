from .data_node import DataNode
import numpy as np

class CentralIMU(DataNode):
    Accel : list[int] #x, y, z
    Gyro : list[int] #x, y, i
    #i : int?
    Mag : list[int] #x, y, z

    @classmethod
    def gen_random_values(cls):
        cls.Accel = np.random.randint(-32767, 32768, size=3).tolist()
        cls.Gyro = np.random.randint(-32767, 32768, size=3).tolist()
        cls.Mag = np.random.randint(-32767, 32768, size=3).tolist()
    
    @classmethod
    def generate_bytes(cls):
        init_list = [
            #3x8 accel, gyro mag
            *cls.to_bytes(cls.Accel[0],2),
            *cls.to_bytes(cls.Accel[1],2),
            *cls.to_bytes(cls.Accel[2],2),
            *[0]*2,
            *cls.to_bytes(cls.Gyro[0],2),
            *cls.to_bytes(cls.Gyro[1],2),
            *cls.to_bytes(cls.Gyro[2],2),
            *[0]*2,
            *cls.to_bytes(cls.Mag[0],2),
            *cls.to_bytes(cls.Mag[1],2),
            *cls.to_bytes(cls.Mag[2],2),
            *[0]*2,
        ]
        return bytes(init_list) #byte rep of list of single byte int reps
    

    