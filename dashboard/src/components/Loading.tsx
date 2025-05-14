import { Loader2 } from "lucide-react";

export const LoadingComponent = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <img
        src="/logo/mapache.png"
        alt="Mapache"
        className="animate-scale mx-auto h-10"
      />
      <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
    </div>
  );
};
