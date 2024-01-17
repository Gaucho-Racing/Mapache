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

    target_cell_number : int
    target_cell_voltage :int
    target_open_cell_voltage: int
    target_cell_temp : int
    target_cell_errors : int


    cell_voltage: list[int]
    cell_temp: list[int]

    ACU_ping_response : int

    @classmethod
    def generate_random_values(cls):
        cls.accumulator_voltage = np.random.randint(0, 65536)
        cls.accumulator_current = np.random.randint(0, 65536)
        cls.max_cell_temp = np.random.randint(-32767, 32767)                             
        cls.state_of_charge = np.random.randint(0, 200)
        cls.error_byte_1 = 0# np.random.randint() should be 1 * some factor of 10
        
        cls.fan_speed = np.random.randint(0, 200, size=4).tolist()
        cls.pump_speed = np.random.randint(0, 101)
        if cls.pump_speed == 101: cls.pump_speed = 255
        cls.water_temp = np.random.randint(-32767, 32767)
        cls.error_byte_2 = 0 # np.random.randint( // same thing

        cls.cell_number = np.random.randint(0,144) #should be inc and not random
        cls.target_cell_voltage = np.random.randint(0,65536)
        cls.target_open_cell_voltage = np.random.randint(0,65536)
        cls.target_cell_temp = np.random.randint(-32767, 32767)
        cls.target_cell_errors = 0 #np.random.randint ( // same thing
        
        cls.cell_voltage = np.random.randint(0, 255, size=144).tolist()
        cls.cell_temp = np.random.randint(0, 255, size=144).tolist()

        cls.ACU_ping_response = 1 #can be anything

    @classmethod
    def generate_bytes(cls):
        init_list = [
            *cls.to_bytes(cls.accumulator_voltage, 2),
            *cls.to_bytes(cls.accumulator_current, 2),
            *cls.to_bytes(cls.max_cell_temp, 2),
            cls.state_of_charge,
            cls.error_byte_1,

            *cls.fan_speed,
            cls.pump_speed,
            *cls.to_bytes(cls.water_temp, 2),
            cls.error_byte_2,

            cls.cell_number,
            *cls.to_bytes(cls.target_cell_voltage, 2),
            *cls.to_bytes(cls.target_open_cell_voltage, 2),
            *cls.to_bytes(cls.target_cell_temp, 2),
            cls.target_cell_errors,

            *[element for row in [[cls.cell_voltage[i], cls.cell_temp[i]] for i in range(144)] for element in row]

            
        ]