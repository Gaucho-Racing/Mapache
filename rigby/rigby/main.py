import random
import time
import sys
import pika
from .nodes.gr24.wheel import Wheel
import numpy as np

def main() -> None: 
    """
    Run the main application logic.
    """
    myWheel = Wheel()
    myWheel.genRandomValues()
    byts = myWheel.generateBytes()
    print(len(byts))
    print("Size of byts: ", sys.getsizeof(byts))
    
if __name__ == "__main__":
    main()

def publish_message(queue: str, message: str) -> None: 
    """
    Publish a message to the specified queue.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    channel.queue_declare(queue=queue)
    channel.basic_publish(exchange='',
        routing_key=queue,
        body=message,
        properties=pika.BasicProperties(
            expiration='2000'
    ))
    print(" [" + str(queue) + "] Sent msg: '" + str(message) + "'")

