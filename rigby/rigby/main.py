import random
import time
import sys
import pika
from .nodes.gr24.wheel import Wheel
from .nodes.gr24.pedals import Pedals
import numpy as np
from paho.mqtt import client as mqtt_client

def main() -> None: 
    """
    Run the main application logic.
    """
    client = connect_mqtt()

    myWheel = Wheel()
    myWheel.gen_random_values()
    byts = myWheel.generate_bytes()
    print(len(byts))
    print("Size of byts: ", sys.getsizeof(byts))

    myPedals = Pedals()
    # myPedals.APPS1 = 120
    # myPedals.APPS2 = 491
    # myPedals.brake_pressure_front = 194
    # myPedals.brake_pressure_rear = 918

    for i in range (0, 100):
        myPedals.gen_random_values()
        pedal_bytes = myPedals.generate_bytes()
        print(myPedals.APPS1)
        client.publish("meta", pedal_bytes)
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
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("Connected to MQTT Broker!")
        else:
            print("Failed to connect, return code %d\n", rc)

    broker = 'localhost'
    port = 1883
    client_id = 'rigby_mqtt_client'
    client = mqtt_client.Client(client_id)
    client.on_connect = on_connect
    client.connect(broker, port)
    return client