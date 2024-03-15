import struct
import numpy as np
from .data_node import DataNode

'''
Latitude				High Precision Latitude			
Longitude				High Precision Longitude			

'''

class GPS(DataNode):
  latitude: float
  longitude: float

  @classmethod
  def gen_random_values(cls):
    cls.latitude = 34.414718
    cls.longitude = -119.841912
  
  @classmethod
  def generate_bytes(cls):
    lat_bytes = cls.float_to_bin32(cls.latitude)
    lon_bytes = cls.float_to_bin32(cls.longitude)
    return cls.bin_to_byte_array(lat_bytes + lon_bytes)

  def float_to_bin32(float_num):
    # Pack the float into a 4-byte string using the 'f' format specifier
    packed = struct.pack('f', float_num)
    # Unpack the 4-byte string as unsigned integers
    ints = struct.unpack('I', packed)
    # Convert the unsigned integer to binary representation
    binary = bin(ints[0])[2:].zfill(32)
    print(binary)
    # Convert the binary string to a bytearray
    return binary
  
  def bin_to_byte_array(bin_str):
    return bytearray(int(bin_str[i:i+8], 2) for i in range(0, len(bin_str), 8))