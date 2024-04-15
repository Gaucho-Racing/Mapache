import struct
import numpy as np
from ...utils.binary import BinFactory

'''
Latitude				High Precision Latitude			
Longitude				High Precision Longitude			

'''

class GPS:
  latitude: float
  longitude: float

  def __init__(self):
    self.latitude = 0
    self.longitude = 0

  def generate(self):
    self.latitude = 34.414718
    self.longitude = -119.841912
  
  def export_bytes(self):
    lat_bytes = BinFactory.float32_to_bin(self.latitude)
    lon_bytes = BinFactory.float32_to_bin(self.longitude)
    return BinFactory.bin_to_byte_array(lat_bytes + lon_bytes)