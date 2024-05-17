import Layout from "@/components/Layout";
import React from "react";

function NodesPage() {
  React.useEffect(() => {}, []);

  return (
    <>
      <Layout activeTab="nodes">
        <h1>Nodes</h1>
        <p className="mt-2 text-neutral-400">
          <div className="flex">
            <div className="mr-1 w-min rounded-md border bg-card px-2">
              Nodes.h
            </div>{" "}
            reference
          </div>
        </p>
        <div className="flex flex-wrap"></div>
      </Layout>
    </>
  );
}

export default NodesPage;
