import React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MAPACHE_API_URL, currentUser } from "@/consts/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";

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
      <div className="flex h-full flex-col items-center justify-center p-32">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    );
  };

  return (
    <>
      <div className=""></div>
      <div className="flex">
        <div className="h-screen w-1/5 overflow-y-auto bg-gradient-to-r from-gr-pink to-gr-purple">
          <div className="flex flex-col p-8">
            <h1 className="text-4xl font-extrabold tracking-tight">Mapache</h1>
          </div>
        </div>
        <div className="mx-auto h-screen w-1/2 bg-black text-center">
          {loading ? (
            <LoadingComponent />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-32">
              Wow this dashboard looks so cool!
              <Button
                className="mt-4 w-full"
                onClick={() => navigate("/pedal")}
                variant="outline"
              >
                Pedals
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DashboardPage;
