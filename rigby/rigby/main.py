from time import sleep
import os
from rigby.utils.mqtt import MQTT
from .nodes.gr24.pedals import Pedals
from .nodes.gr24.gps import GPS
from .nodes.gr24.bcm import BCM

def main() -> None:
    """
    Run the main application logic.
    """
    mqtt_client = MQTT(
        broker = os.getenv('MQTT_BROKER', 'localhost'),
        port = int(os.getenv('MQTT_PORT', '1883')),
        username = os.getenv('MQTT_USERNAME', 'rigby'),
        password = os.getenv('MQTT_PASSWORD', 'rigby')
    )
    mqtt_client.publish_message("meta", "Rigby is online!")

    pedals = Pedals()
    gps = GPS()
    bcm = BCM()

    while True:
        pedals.generate()
        mqtt_client.publish_message("gr24/pedal", pedals.to_bytes())
        
        gps.generate()
        mqtt_client.publish_message("gr24/gps", gps.to_bytes())

        bcm.test_generate()
        mqtt_client.publish_message("gr24/bcm", bcm.to_bytes())
        
        sleep(1)


if __name__ == "__main__":
    main()