#getter functions for various resources

with open("resources/sensors.txt", "r") as f:
    gr24_sensors = [line.strip() for line in f]

def get_sensors(vid):
    if vid == "gr24":
        return gr24_sensors
    else:
        return None