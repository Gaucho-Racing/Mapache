import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export const AuthLoading = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Card className="border-none p-8" style={{ width: 500 }}>
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo/mechanic-logo.png"
            alt="Gaucho Racing"
            className="mx-auto h-24"
          />
          <Loader2 className="mt-8 h-16 w-16 animate-spin" />
        </div>
      </Card>
    </div>
  );
};
