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
import {
  AlertDialogHeader,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@radix-ui/react-alert-dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@radix-ui/react-popover";
import { toast } from "sonner";

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
    // {
    //   id: 7,
    //   name: "Graph Live",
    //   width: 600,
    //   height: 300,
    //   component: <GraphLiveWidget field={"altitude"} />,
    // },
    // {
    //   id: 8,
    //   name: "Graph Live",
    //   width: 600,
    //   height: 300,
    //   component: <GraphLiveWidget field={"heading"} />,
    // },
    // {
    //   id: 9,
    //   name: "Graph Live",
    //   width: 600,
    //   height: 300,
    //   component: <GraphLiveWidget field={"accelerometer_x"} />,
    // },
  ]);

  useEffect(() => {});

  const SelectWidgetsDialog = () => {
    return (
      <AlertDialog>
        <AlertDialogTrigger>
          <OutlineButton>Select Widgets ({widgets.length})</OutlineButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          <OutlineButton
            onClick={() => {
              toast("bruh");
              console.log("bruh");
            }}
          >
            Select Widgets ({widgets.length})
          </OutlineButton>
          <Button
            onClick={() => {
              toast("bruh");
              console.log("bruh");
            }}
          >
            Refresh
          </Button>
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
