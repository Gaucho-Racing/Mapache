from time import sleep
import os
from rigby.utils.mqtt import MQTT
from .nodes.gr24.pedal import Pedal
from .nodes.gr24.gps import GPS
from .nodes.gr24.bcm import BCM

def main() -> None:
    """
    Run the main application logic.
    """
    mqtt_client = MQTT(
        broker = os.getenv('MQTT_HOST', 'localhost'),
        port = int(os.getenv('MQTT_PORT', '1883')),
        username = os.getenv('MQTT_USERNAME', 'rigby'),
        password = os.getenv('MQTT_PASSWORD', 'rigby')
    )
    mqtt_client.publish_message("meta", "Rigby is online!")

    car_id = "test"

    pedals = Pedal()
    gps = GPS()
    bcm = BCM()

    while True:
        pedals.generate()
        mqtt_client.publish_message(f"gr24/{car_id}/pedal", pedals.to_bytes())
        
        gps.generate()
        # mqtt_client.publish_message(f"gr24/{car_id}/gps", gps.to_bytes())

        bcm.test_generate()
        # mqtt_client.publish_message(f"gr24/{car_id}/bcm", bcm.to_bytes())
        
        sleep(0.2)


if __name__ == "__main__":
    main()
