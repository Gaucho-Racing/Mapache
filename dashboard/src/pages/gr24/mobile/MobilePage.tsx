import Layout from "@/components/Layout";
import React, { useRef, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Mobile, initMobile } from "@/models/gr24/mobile";
import MapLiveWidget from "./widgets/MapLiveWidget";
import { Card } from "@/components/ui/card";
import SpeedLiveWidget from "./widgets/SpeedLiveWidget";
import MapSpeedLiveWidget from "./widgets/MapSpeedLiveWidget";
import DebugLiveWidget from "./widgets/DebugLiveWidget";

function MobilePage() {
  const [socketUrl] = React.useState("ws://localhost:10310/ws/gr24/mobile");
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);

  const [widgets, setWidgets] = useState([
    {
      id: 1,
      name: "Map Live",
      width: 600,
      height: 300,
      component: <MapLiveWidget />,
    },
    {
      id: 2,
      name: "Speed Live",
      width: 300,
      height: 300,
      component: <SpeedLiveWidget />,
    },
    {
      id: 3,
      name: "Speed Live",
      width: 600,
      height: 300,
      component: <MapSpeedLiveWidget />,
    },
    {
      id: 4,
      name: "Speed Live",
      width: 300,
      height: 300,
      component: <SpeedLiveWidget />,
    },
    {
      id: 5,
      name: "Speed Live",
      width: 932,
      height: 300,
      component: <MapSpeedLiveWidget />,
    },
    {
      id: 6,
      name: "Speed Live",
      width: 600,
      height: 300,
      component: <DebugLiveWidget />,
    },
  ]);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setMessageJson(data);
    }
  }, [lastMessage]);

  return (
    <>
      <Layout activeTab="mobile">
        <h1>Mobile</h1>
        <p className="mt-2 text-neutral-400">Phone on car!</p>
        <div className="flex flex-wrap">
          {widgets.map((widget) => (
            <Card
              key={widget.id}
              style={{ width: widget.width, height: widget.height }}
              className="my-4 mr-8 overflow-clip"
            >
              {widget.component}
            </Card>
          ))}
        </div>
      </Layout>
    </>
  );
}

export default MobilePage;
