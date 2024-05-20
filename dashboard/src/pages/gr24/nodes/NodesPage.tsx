import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import React, { useMemo } from "react";
import ReactFlow from "reactflow";

import "reactflow/dist/style.css";

function NodesPage() {
  React.useEffect(() => {}, []);

  const nodeTypes = useMemo(() => {
    return {
      wheel: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 60,
              height: 125,
            }}
          >
            {data.label}
          </div>
        );
      },
      acu: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 200,
              height: 75,
            }}
          >
            {data.label}
          </div>
        );
      },
      inverter: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 150,
              height: 75,
            }}
          >
            {data.label}
          </div>
        );
      },
      ecu: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 150,
              height: 150,
            }}
          >
            {data.label}
          </div>
        );
      },
      dpanel: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 250,
              height: 50,
            }}
          >
            {data.label}
          </div>
        );
      },
      steering: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 100,
              height: 75,
            }}
          >
            {data.label}
          </div>
        );
      },
      node_small: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border bg-card text-xl font-bold text-white"
            style={{
              width: 100,
              height: 50,
            }}
          >
            {data.label}
          </div>
        );
      },
    };
  }, []);

  const initialNodes = [
    {
      id: "wheel/fl",
      position: { x: 20, y: 100 },
      data: { label: "FL" },
      type: "wheel",
    },
    {
      id: "wheel/fr",
      position: { x: 400, y: 100 },
      data: { label: "FR" },
      type: "wheel",
    },
    {
      id: "wheel/rl",
      position: { x: 20, y: 600 },
      data: { label: "RL" },
      type: "wheel",
    },
    {
      id: "wheel/rr",
      position: { x: 400, y: 600 },
      data: { label: "RR" },
      type: "wheel",
    },
    {
      id: "acu",
      position: { x: 142.5, y: 700 },
      data: { label: "ACU" },
      type: "acu",
    },
    {
      id: "inverter",
      position: { x: 165, y: 600 },
      data: { label: "Inverter" },
      type: "inverter",
    },
    {
      id: "vdm",
      position: { x: 165, y: 400 },
      data: { label: "VDM" },
      type: "ecu",
    },
    {
      id: "tcm",
      position: { x: 240, y: 50 },
      data: { label: "TCM" },
      type: "node_small",
    },
    {
      id: "bcm",
      position: { x: 125, y: 50 },
      data: { label: "BCM" },
      type: "node_small",
    },
    {
      id: "pedal",
      position: { x: 180, y: 120 },
      data: { label: "Pedals" },
      type: "node_small",
    },
    {
      id: "steering",
      position: { x: 185, y: 260 },
      data: { label: "Steering" },
      type: "steering",
    },
    {
      id: "dpanel",
      position: { x: 110, y: 190 },
      data: { label: "Dash Panel" },
      type: "dpanel",
    },
  ];
  const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

  return (
    <>
      <Layout activeTab="nodes">
        <h1>Nodes</h1>
        <p className="mt-2 text-neutral-400">
          <div className="flex">
            Haha it's a{" "}
            <div className="mx-1 w-min rounded-md border bg-card px-2">
              Nodes.h
            </div>{" "}
            reference
          </div>
        </p>
        <div className="flex flex-wrap">
          <Card
            style={{ width: "50vw", height: "70vh" }}
            className="my-4 border-none bg-black"
          >
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
              nodeTypes={nodeTypes}
            ></ReactFlow>
          </Card>
        </div>
      </Layout>
    </>
  );
}

export default NodesPage;
