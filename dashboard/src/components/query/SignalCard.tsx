import { SignalDefinition } from "@/models/signal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@radix-ui/react-checkbox";
import {
  CheckCheckIcon,
  CheckCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface SignalCardProps {
  signal: SignalDefinition;
  selected: boolean;
}

export function SignalCard({ signal, selected }: SignalCardProps) {
  return (
    <Card className="w-full border-none bg-transparent px-4 py-1 hover:bg-card">
      <div className="flex flex-row items-center justify-start gap-4">
        <div>
          {selected ? (
            <CheckCircle2 className="h-4 w-4 fill-gr-pink text-white" />
          ) : (
            <Circle className="h-4 w-4 text-white" />
          )}
        </div>
        <div>
          <div>{signal.name == "" ? signal.id : signal.name}</div>
          <div className="text-sm text-muted-foreground">{signal.id}</div>
        </div>
      </div>
    </Card>
  );
}
