import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import mqtt from "mqtt";
import React from "react";
import { MQTT_HOST, MQTT_PORT } from "@/consts/config";

function PedalDetailsPage() {
  const { toast } = useToast();

  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    rabbitMQ();
  }, []);

  const rabbitMQ = async () => {
    const client = mqtt.connect(`wss://${MQTT_HOST}:${MQTT_PORT}`, {
      log: console.log.bind(console),
      clientId: `dashboard + ${Math.random().toString(16).substr(2, 8)}`,
      username: "ingest",
      password: "ingest",
    });
    client.on("connect", () => {
      console.log("connected");
      setConnected(true);
      client.subscribe("presence", (err) => {
        if (!err) {
          console.log("subscribed");
          client.publish("presence", "Hello mqtt");
        }
      });
    });
    client.on("message", (topic, message) => {
      console.log("message", topic, message.toString());
    });

    // client.on("close", () => {
    //   console.log("close");
    //   setConnected(false);
    // });
  };

  return (
    <>
      <div className="flex">
        <div className="bg-gradient-to-r from-gr-pink to-gr-purple">
          Hello world, MQTT is {connected ? "connected" : "disconnected"}
        </div>
      </div>
    </>
  );
}

export default PedalDetailsPage;
