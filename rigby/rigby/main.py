import pika

def main() -> None:
    """
    Run the main application logic.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    channel.queue_declare(queue='meta')
    channel.basic_publish(exchange='',
                      routing_key='meta',
                      body='Hello World!')
    print(" [x] Sent 'Hello World!'")

if __name__ == "__main__":
    main()
