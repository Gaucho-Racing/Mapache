import random
import time
import sys
import os
from .nodes.gr24.wheel import Wheel
from .nodes.gr24.central_imu import CentralIMU
from .nodes.gr24.pedals import Pedals
from .nodes.gr24.gps import GPS
import numpy as np
from paho.mqtt import client as mqtt_client

def main() -> None:
    """
    Run the main application logic.
    """
    client = connect_mqtt()

    myPedals = Pedals()
    wheelFR = Wheel()
    wheelFL = Wheel()
    wheelRR = Wheel()
    wheelRL = Wheel()
    myIMU = CentralIMU()
    myGPS = GPS()

    myGPS.gen_random_values()
    print(myGPS.latitude)
    print(myGPS.longitude)
    gps_bytes = myGPS.generate_bytes()
    print(gps_bytes)


    for i in range (0, 1000):
        # myPedals.gen_random_values()
        # pedal_bytes = myPedals.generate_bytes()
        # publish_message(client, "gr24/pedal", pedal_bytes)

        # for wheel, topic in zip([wheelFR, wheelFL, wheelRR, wheelRL], ["gr24/wheel/fr", "gr24/wheel/fl", "gr24/wheel/rr", "gr24/wheel/rl"]):
        #     wheel.gen_random_values()
        #     wheel_bytes = wheel.generate_bytes()
        #     publish_message(client, topic, wheel_bytes)
        
        # myIMU.gen_random_values()
        # imu_bytes = myIMU.generate_bytes()
        # publish_message(client, "gr24/imu", imu_bytes)
        
        myGPS.gen_random_values()
        gps_bytes = myGPS.generate_bytes()
        publish_message(client, "gr24/gps", gps_bytes)

        time.sleep(1)


if __name__ == "__main__":
    main()

def publish_message(client: mqtt_client, queue: str, message: str) -> None:
    """
    Publish a message to the specified queue.
    """
    result = client.publish(queue, message)
    status = result[0]
    if status == 0:
        print(f"Send `{message}` to topic `{queue}`")
    else:
        print(f"Failed to send message to topic {queue}")


def connect_mqtt() -> mqtt_client:
    """
    Connect to the MQTT broker.
    """
    broker = "localhost"
    port = 1883
    client_id = 'rigby_mqtt_' + str(random.randint(0, 100))

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"Connected to MQTT Broker as ${client_id}!")
        else:
            print("Failed to connect, return code %d\n", rc)

    client = mqtt_client.Client(client_id)
    client.username_pw_set("rigby", "rigby")
    client.on_connect = on_connect
    client.connect(broker, port)
    return client
