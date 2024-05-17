import Layout from "@/components/Layout";
import React from "react";

function PedalPage() {
  React.useEffect(() => {}, []);

  return (
    <>
      <Layout activeTab="pedal">
        <h1>Pedals</h1>
        <p className="mt-2 text-neutral-400">
          The original demo, now with graphs!
        </p>
        <div className="flex flex-wrap"></div>
      </Layout>
    </>
  );
}

export default PedalPage;
