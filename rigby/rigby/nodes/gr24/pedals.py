import numpy as np
from ...utils.binary import BinFactory
from ...utils.generator import Valgen

'''
APPS 1		APPS 1		Brake Pressure F		Brake Pressure R
Anything
'''

class Pedals:
    APPS1: int
    APPS2: int
    brake_pressure_front: int
    brake_pressure_rear: int

    def __init__(self):
        self.APPS1 = 0
        self.APPS2 = 0
        self.brake_pressure_front = 0
        self.brake_pressure_rear = 0

    def generate(self):
        self.APPS1 = Valgen.smart_rand(0, 100, self.APPS1, 10, 0.6)
        self.APPS2 = Valgen.smart_rand(0, 100, self.APPS2, 10, 0.6)
        self.brake_pressure_front = Valgen.smart_rand(0, 256, self.brake_pressure_front, 10)
        self.brake_pressure_rear = Valgen.smart_rand(0, 256, self.brake_pressure_rear, 10)

    def export_bytes(self):
        bytes = BinFactory.uint_to_bin(self.APPS1, 2) + BinFactory.uint_to_bin(self.APPS2, 2) + BinFactory.uint_to_bin(self.brake_pressure_front, 2) + BinFactory.uint_to_bin(self.brake_pressure_rear, 2)
        return BinFactory.bin_to_byte_array(bytes)
