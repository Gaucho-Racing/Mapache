import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import React from "react";
import ReactFlow from "reactflow";

import "reactflow/dist/style.css";

function NodesPage() {
  React.useEffect(() => {}, []);

  const initialNodes = [
    { id: "1", position: { x: 0, y: 0 }, data: { label: "VDM" } },
    { id: "2", position: { x: 0, y: 100 }, data: { label: "2" } },
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
            style={{ width: "50vw", height: "50vh" }}
            className="my-4 bg-black"
          >
            <ReactFlow nodes={initialNodes} edges={initialEdges}></ReactFlow>
          </Card>
        </div>
      </Layout>
    </>
  );
}

export default NodesPage;
