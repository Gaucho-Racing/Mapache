import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import MapLiveWidget from "./widgets/MapLiveWidget";
import { Card } from "@/components/ui/card";
import SpeedLiveWidget from "./widgets/SpeedLiveWidget";
import MapSpeedLiveWidget from "./widgets/MapSpeedLiveWidget";
import DebugLiveWidget from "./widgets/DebugLiveWidget";
import AccelerometerLiveWidget from "./widgets/AccelerometerLiveWidget";
import GraphLiveWidget from "./widgets/AltitudeGraphLiveWidget";
import { Button } from "@/components/ui/button";
import { OutlineButton } from "@/components/ui/outline-button";

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
      name: "Map Speed Live",
      width: 600,
      height: 300,
      component: <MapSpeedLiveWidget />,
    },
    {
      id: 4,
      name: "Accelerometer Live",
      width: 300,
      height: 300,
      component: <AccelerometerLiveWidget />,
    },
    {
      id: 5,
      name: "Map Speed Live Big",
      width: 932,
      height: 300,
      component: <MapSpeedLiveWidget />,
    },
    {
      id: 6,
      name: "Debug Live",
      width: 600,
      height: 300,
      component: <DebugLiveWidget />,
    },
    {
      id: 7,
      name: "Graph Live",
      width: 600,
      height: 300,
      component: <GraphLiveWidget field={"altitude"} />,
    },
    {
      id: 8,
      name: "Graph Live",
      width: 600,
      height: 300,
      component: <GraphLiveWidget field={"heading"} />,
    },
    {
      id: 9,
      name: "Graph Live",
      width: 600,
      height: 300,
      component: <GraphLiveWidget field={"accelerometer_x"} />,
    },
  ]);

  useEffect(() => {});

  return (
    <>
      <Layout activeTab="mobile">
        <div className="flex flex-row items-end justify-between">
          <div>
            <h1>Mobile</h1>
            <p className="mt-2 text-neutral-400">Phone on car!</p>
          </div>
          <OutlineButton onClick={() => {}}>
            Select Widgets ({widgets.length})
          </OutlineButton>
        </div>
        <div className="flex flex-wrap">
          {widgets.map((widget) => (
            <Card
              key={widget.id}
              style={{ width: widget.width, height: widget.height }}
              className="my-3 mr-6 overflow-clip"
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
