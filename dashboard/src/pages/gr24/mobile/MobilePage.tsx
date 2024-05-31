import Layout from "@/components/Layout";
import React from "react";

function MobilePage() {
  React.useEffect(() => {}, []);

  return (
    <>
      <Layout activeTab="pedal">
        <h1>Mobile</h1>
        <p className="mt-2 text-neutral-400">Phone on car!</p>
        <div className="flex flex-wrap"></div>
      </Layout>
    </>
  );
}

export default MobilePage;
