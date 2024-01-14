import numpy as np
from data_node import data_node

'''
Accumulator Voltage,		Accumulator Current,		Max Cell Temp,		State of Charge(1),	Errors(1)
Fan 1 Speed,	Fan 2 Speed,	Fan 3 Speed,	Fan 4 Speed,	Pump Speed,	Water Temp(2),		Errors
excludes row 8, and final row of ping data (38/40)
'''
class ACU(data_node):
    accumulator_voltage : int
    accumulator_current: int
    max_cell_temp : int
    state_of_charge: int
    error_byte_1 : int

    fan_speed : list[int]
    pump_speed : int
    water_temp : int
    error_byte_2: int

    cell_voltage: list[int]
    cell_temp: list[int]

    @classmethod
    def generate_random_values(cls):
        cls.cell_voltage = np.random.randint(200, 456, size=144).tolist()
        cls.cell_temp = np.random.randint(1000, 7375, size=144).tolist()

    @classmethod
    def generate_bytes(cls):
        init_list = [
            *[cls.cell_voltage-200, (cls.cell_temp-1000)/25]
        ]