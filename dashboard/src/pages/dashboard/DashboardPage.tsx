import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import GR24PedalLiveWidget from "../gr24/pedal/PedalLiveWidget";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";

function DashboardPage() {
  const navigate = useNavigate();

  return (
    <>
      <Layout activeTab="dash">
        <h1>Dashboard</h1>
        <p className="mt-2 text-neutral-400">I love singlestore</p>
        <Button
          className="mt-4 w-full"
          onClick={() => navigate("/pedal")}
          variant="outline"
        >
          Pedals
        </Button>
        <Card
          className="m-2 overflow-hidden bg-background"
          style={{ width: "300px", height: "300px" }}
        >
          <GR24PedalLiveWidget />
        </Card>
        <Card
          className="m-2 overflow-hidden bg-background"
          style={{ width: "300px", height: "300px" }}
        >
          <GR24PedalLiveWidget />
        </Card>
        <Card
          className="m-2 overflow-hidden bg-background"
          style={{ width: "300px", height: "300px" }}
        >
          <GR24PedalLiveWidget />
        </Card>
        <Card
          className="m-2 overflow-hidden bg-background"
          style={{ width: "300px", height: "300px" }}
        >
          <GR24PedalLiveWidget />
        </Card>
      </Layout>
    </>
  );
}

export default DashboardPage;
