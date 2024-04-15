from paho.mqtt import client as mqtt_client
from random import randint

class MQTT:
    client: mqtt_client.Client
    broker: str
    port: int
    client_id: str
    username: str
    password: str

    def __init__(self, broker: str = "localhost", port: int = 1883, username: str = "rigby", password: str = "rigby"):
        self.client_id = 'rigby_mqtt_' + str(randint(0, 100))
        self.broker = broker
        self.port = port
        self.username = username
        self.password = password

        self.client = self.connect_mqtt()

    def publish_message(self, queue: str, message: str) -> None:
        """
        Publish a message to the specified queue.
        """
        result = self.client.publish(queue, message)
        status = result[0]
        if status == 0:
            print(f"Sent `{message}` to topic `{queue}`")
        else:
            print(f"Failed to send message to topic {queue}")

    def connect_mqtt(self) -> mqtt_client:
        """
        Connect to the MQTT broker.
        """

        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                print(f"Connected to MQTT Broker as ${self.client_id}!")
            else:
                print("Failed to connect, return code %d\n", rc)

        client = mqtt_client.Client(self.client_id)
        client.username_pw_set(self.username, self.password)
        client.on_connect = on_connect
        client.connect(self.broker, self.port)
        return client