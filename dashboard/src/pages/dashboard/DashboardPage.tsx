import React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MAPACHE_API_URL, currentUser } from "@/consts/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";
import DashboardHeader from "@/components/DashboardHeader";
import GR24PedalLiveWidget from "../gr24/pedal/PedalLiveWidget";
import { Card } from "@/components/ui/card";

function DashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    init();
  }, []);

  const init = async () => {
    var status = await checkCredentials();
    if (status != 0) {
      navigate("/auth/register");
    } else {
      setLoading(false);
    }
  };

  const LoadingComponent = () => {
    return (
      <div className="mx-auto h-screen bg-black text-center">
        <div className="flex h-full flex-col items-center justify-center p-32">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  };

  return (
    <>
      {loading ? (
        <LoadingComponent />
      ) : (
        <div className="mt-24 w-full items-center justify-center">
          <DashboardHeader />
          <div className="m-4">
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
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardPage;
