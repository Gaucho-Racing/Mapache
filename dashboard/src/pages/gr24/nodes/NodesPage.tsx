import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import React, { useMemo } from "react";
import ReactFlow, { Handle, Position } from "reactflow";

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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
            <Handle
              type="target"
              position={Position.Top}
              className="!bg-gr-pink opacity-0"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              className="!bg-gr-pink opacity-0"
            />
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
      position: { x: 135, y: 700 },
      data: { label: "ACU" },
      type: "acu",
    },
    {
      id: "inverter",
      position: { x: 160, y: 600 },
      data: { label: "Inverter" },
      type: "inverter",
    },
    {
      id: "vdm",
      position: { x: 160, y: 400 },
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
      position: { x: 185, y: 120 },
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
  const animated = false;
  const initialEdges = [
    { id: "1", target: "bcm", source: "tcm", animated: animated },
    {
      id: "2",
      source: "tcm",
      target: "pedal",
      animated: animated,
    },
    {
      id: "2",
      source: "pedal",
      target: "dpanel",
      animated: animated,
    },
    {
      id: "3",
      source: "pedal",
      target: "dpanel",
      animated: animated,
    },
    {
      id: "4",
      source: "dpanel",
      target: "steering",
      animated: animated,
    },
    {
      id: "5",
      source: "steering",
      target: "vdm",
      animated: animated,
    },
    {
      id: "6",
      source: "vdm",
      target: "inverter",
      animated: animated,
    },
    {
      id: "7",
      source: "inverter",
      target: "acu",
      animated: animated,
    },
    {
      id: "8",
      source: "wheel/fl",
      target: "wheel/rl",
      animated: animated,
    },
    {
      id: "8",
      source: "wheel/fr",
      target: "wheel/rr",
      animated: animated,
    },
    {
      id: "10",
      target: "wheel/rl",
      source: "bcm",
      animated: animated,
    },
    {
      id: "11",
      target: "wheel/rr",
      source: "bcm",
      animated: animated,
    },
    // {
    //   id: "8",
    //   target: "wheel/fl",
    //   source: "bcm",
    //   animated: animated,
    // },
    // {
    //   id: "9",
    //   target: "wheel/fr",
    //   source: "bcm",
    //   animated: animated,
    // },
    // {
    //   id: "10",
    //   target: "wheel/rl",
    //   source: "bcm",
    //   animated: animated,
    // },
    // {
    //   id: "11",
    //   target: "wheel/rr",
    //   source: "bcm",
    //   animated: animated,
    // },
  ];

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
          <Card style={{ width: "50vw", height: "70vh" }} className="my-4">
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
              nodeTypes={nodeTypes}
              proOptions={{ hideAttribution: true }}
            ></ReactFlow>
          </Card>
        </div>
      </Layout>
    </>
  );
}

export default NodesPage;
