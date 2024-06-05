import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import MapSpeedLiveWidget from "./widgets/MapSpeedLiveWidget";
import DebugLiveWidget from "./widgets/DebugLiveWidget";
import AccelerometerLiveWidget from "./widgets/AccelerometerLiveWidget";
import { Button } from "@/components/ui/button";
import { mobileLiveWidgets } from "@/consts/config";
import DebugRawLiveWidget from "./widgets/DebugRawLiveWidget";

function MobilePage() {
  const [selectingWidgets, setSelectingWidgets] = useState(false);
  const [widgets, setWidgets] = useState([
    {
      name: "Map w/ Speed Large",
      width: 932,
      height: 300,
      component: <MapSpeedLiveWidget />,
    },
    {
      name: "Accelerometer Plot",
      width: 300,
      height: 300,
      component: <AccelerometerLiveWidget />,
    },
    {
      name: "Debug Live",
      width: 600,
      height: 300,
      component: <DebugLiveWidget />,
    },
    {
      name: "Raw Debug Live",
      width: 600,
      height: 300,
      component: <DebugRawLiveWidget />,
    },
  ]);

  useEffect(() => {});

  function addToWidgets(widget) {
    if (!widgets.some((item) => item.name === widget.name)) {
      setWidgets((prevWidgets) => [...prevWidgets, widget]);
    }
  }

  function removeFromWidgets(widget) {
    setWidgets((prevWidgets) =>
      prevWidgets.filter((item) => item.name !== widget.name),
    );
  }

  const SelectWidgetsComponent = () => {
    return (
      <div className="p-4">
        <Card className="p-4">
          <h3>Select Widgets</h3>
          {mobileLiveWidgets.map((widget) => (
            <div
              key={widget.name}
              className="my-2 flex items-center justify-between"
            >
              <p>{widget.name}</p>
              {widgets.some((item) => item.name === widget.name) ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    removeFromWidgets(widget);
                  }}
                >
                  Remove
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    addToWidgets(widget);
                  }}
                >
                  Add
                </Button>
              )}
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <>
      <Layout activeTab="mobile">
        <div className="flex flex-row items-end justify-between">
          <div>
            <h1>Mobile</h1>
            <p className="mt-2 text-neutral-400">Phone on car!</p>
          </div>
          <Button
            onClick={() => {
              setSelectingWidgets(!selectingWidgets);
            }}
            variant={selectingWidgets ? "secondary" : "outline"}
          >
            {selectingWidgets ? "Save" : "Select Widgets"}
          </Button>
        </div>
        {selectingWidgets ? (
          <SelectWidgetsComponent />
        ) : (
          <div className="flex flex-wrap">
            {widgets.map((widget) => (
              <Card
                key={widget.id}
                style={{ width: widget.width, height: widget.height }}
                className="my-3 mr-6 overflow-auto"
              >
                {widget.component}
              </Card>
            ))}
          </div>
        )}
      </Layout>
    </>
  );
}

export default MobilePage;
