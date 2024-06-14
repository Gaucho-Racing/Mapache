import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useState } from "react";
import React from "react";
import GR24PedalLiveWidget from "../pedal/widgets/PedalLiveWidget";
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

function DashboardPage() {
  const [widgets, setWidgets] = useState([
    {
      id: 1,
      name: "Pedal Live",
      width: 300,
      height: 300,
      component: <GR24PedalLiveWidget />,
    },
  ]);

  const loadWidgets = () => {
    setWidgets([
      ...widgets,
      {
        id: 2,
        name: "Pedal Live",
        width: 300,
        height: 300,
        component: <GR24PedalLiveWidget />,
      },
    ]);
  };

  React.useEffect(() => {
    loadWidgets();
  }, []);

  return (
    <>
      <Layout activeTab="dash">
        <h1>Dashboard</h1>
        <p className="mt-2 text-neutral-400">I love singlestore</p>
        <div className="flex flex-wrap">
          {widgets.map((widget) => (
            <Card
              key={widget.id}
              style={{ width: widget.width, height: widget.height }}
              className="my-4 mr-8"
            >
              {widget.component}
            </Card>
          ))}
        </div>
      </Layout>
    </>
  );
}

export default DashboardPage;
