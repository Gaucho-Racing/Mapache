import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useState } from "react";
import React from "react";
import GR24PedalLiveWidget from "../pedal/PedalLiveWidget";

function DashboardPage() {
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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

  const handleResize = () => {
    const width = window.innerWidth;
    setWindowWidth(width);
  };

  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    loadWidgets();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
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
              style={{ width: widget.width, height: widget.height, margin: 8 }}
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
