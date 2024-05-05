import numpy as np
from ...utils.binary import BinFactory
from ...utils.generator import Valgen

'''
APPS 1		APPS 1		Brake Pressure F		Brake Pressure R
Anything
'''

class Pedal:
    millis: int
    APPS1: int
    APPS2: int
    brake_pressure_front: int
    brake_pressure_rear: int

    def __init__(self):
        self.millis = 0
        self.APPS1 = 0
        self.APPS2 = 0
        self.brake_pressure_front = 0
        self.brake_pressure_rear = 0

    def generate(self):
        self.millis += 1
        self.APPS1 = Valgen.smart_rand(44256, 50100, self.APPS1, 500, 0.5)
        self.APPS2 = Valgen.smart_rand(38750, 41810, self.APPS2, 500, 0.5)
        self.brake_pressure_front = Valgen.smart_rand(0, 256, self.brake_pressure_front, 10)
        self.brake_pressure_rear = Valgen.smart_rand(0, 256, self.brake_pressure_rear, 10)

    def test_generate(self):
        self.millis = 12838
        self.APPS1 = 44956
        self.APPS2 = 38950
        self.brake_pressure_front = 188
        self.brake_pressure_rear = 120

    def to_bytes(self):
        bytes = BinFactory.uint_to_bin(self.APPS1, 2) + BinFactory.uint_to_bin(self.APPS2, 2) + BinFactory.uint_to_bin(self.brake_pressure_front, 2) + BinFactory.uint_to_bin(self.brake_pressure_rear, 2) + BinFactory.uint_to_bin(self.millis, 4) + BinFactory.fill_bytes(4)
        return BinFactory.bin_to_byte_array(bytes)
