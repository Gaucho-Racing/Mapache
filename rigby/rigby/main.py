import random
import time
import sys
import os
from .nodes.gr24.wheel import Wheel
from .nodes.gr24.central_imu import CentralIMU
from .nodes.gr24.pedals import Pedals
from .nodes.gr24.gps import GPS
from .utils.binary import BinFactory
from .utils.generator import Valgen
import numpy as np
from paho.mqtt import client as mqtt_client

def main() -> None:
    """
    Run the main application logic.
    """
    client = connect_mqtt()

    val = 0
    while True:
        val = Valgen.smart_rand(0, 255, val, 5)
        print(val)
        time.sleep(0.2)


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
