import numpy as np
from .data_node import DataNode

'''
APPS 1		APPS 1		Brake Pressure F		Brake Pressure R	
Anything							
'''

class Pedals(DataNode):
    APPS1 : int
    APPS2 : int
    brake_pressure_front : int
    brake_pressure_rear : int
    #pedal_ping_response : anything

    @classmethod
    def gen_random_values(cls):
        cls.APPS1 = np.random.randint(0, 10000)
        cls.APPS2 = np.random.randint(0, 10000)
        cls.brake_pressure_front = np.random.randint(0, 10000)
        cls.brake_pressure_rear = np.random.randint(0, 10000)

    @classmethod
    def generate_bytes(cls):
        init_list = [
            *cls.to_bytes(cls.APPS1, 2),
            *cls.to_bytes(cls.APPS2, 2),
            *cls.to_bytes(cls.brake_pressure_front, 2),
            *cls.to_bytes(cls.brake_pressure_rear, 2),
            *([0]*8) #excludes pedal ping response
        ]
        return bytes(init_list)

