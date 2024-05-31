import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import MapLiveWidget from "./widgets/MapLiveWidget";
import { Card } from "@/components/ui/card";
import SpeedLiveWidget from "./widgets/SpeedLiveWidget";
import MapSpeedLiveWidget from "./widgets/MapSpeedLiveWidget";
import DebugLiveWidget from "./widgets/DebugLiveWidget";
import AccelerometerLiveWidget from "./widgets/AccelerometerLiveWidget";

function MobilePage() {
  const [widgets] = useState([
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
      component: <AccelerometerLiveWidget />,
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

  useEffect(() => {});

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
