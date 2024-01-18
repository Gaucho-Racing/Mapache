import random
import time
import sys
import os
from .nodes.gr24.wheel import Wheel
from .nodes.gr24.pedals import Pedals
import numpy as np
from paho.mqtt import client as mqtt_client

def main() -> None: 
    """
    Run the main application logic.
    """
    client = connect_mqtt()

    myPedals = Pedals()

    for i in range (0, 100):
        myPedals.gen_random_values()
        pedal_bytes = myPedals.generate_bytes()
        print(myPedals.APPS1)
        publish_message(client, "meta", pedal_bytes)
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
    broker = os.environ.get('MQTT_HOST')
    port = int(os.environ.get('MQTT_PORT'))
    client_id = 'rigby_mqtt_' + str(random.randint(0, 100))

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"Connected to MQTT Broker as ${client_id}!")
        else:
            print("Failed to connect, return code %d\n", rc)

    client = mqtt_client.Client(client_id)
    client.username_pw_set(os.environ.get("MQTT_USER"), os.environ.get("MQTT_PASSWORD"))
    client.on_connect = on_connect
    client.connect(broker, port)
    return client