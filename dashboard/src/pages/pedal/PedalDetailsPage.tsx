import React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function PedalDetailsPage() {
  const { toast } = useToast();

  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {}, []);

  return (
    <>
      <div className="flex">
        <div className="bg-gradient-to-r from-gr-pink to-gr-purple">
          Hello world
        </div>
      </div>
    </>
  );
}

export default PedalDetailsPage;
