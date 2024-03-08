import numpy as np
from .data_node import DataNode

'''
Latitude				High Precision Latitude			
Longitude				High Precision Longitude			

'''

class GPS(DataNode):
  latitude : int
  high_precision_latitude : int
  longitude : int
  high_precision_longitude : int

  @classmethod
  def gen_random_values(cls):
    cls.latitude = np.random.uniform(-90, 90)
    cls.high_precision_latitude = np.random.uniform(-90, 90)
    cls.longitude = np.random.uniform(-180, 180)
    cls.high_precision_longitude = np.random.uniform(-180, 180)
  
  @classmethod
  def generate_bytes(cls):
    init_list = [
      *cls.to_bytes(cls.latitude, 4),
      *cls.to_bytes(cls.high_precision_latitude, 4),
      *cls.to_bytes(cls.longitude, 4),
      *cls.to_bytes(cls.high_precision_longitude, 4)
    ]

    return bytes(init_list)
