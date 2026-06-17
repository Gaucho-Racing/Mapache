import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SignalTree } from "@/components/signals/SignalTree";
import { cn } from "@/lib/utils";

interface CalibrationControlsProps {
  signalNames: string[];
  selected: string[];
  onToggleSignal: (id: string) => void;
  normalized: boolean;
  onNormalizedChange: (normalized: boolean) => void;
  // Cropped window, pre-formatted for display.
  cropLabel: string;
  // True once a window of data is loaded (a cluster/session is selected).
  canCreate: boolean;
  onCreateSession: (name: string) => void;
}

export default function CalibrationControls({
  signalNames,
  selected,
  onToggleSignal,
  normalized,
  onNormalizedChange,
  cropLabel,
  canCreate,
  onCreateSession,
}: CalibrationControlsProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">
          Signals
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className={selected.length ? "" : "text-muted-foreground"}>
                {selected.length
                  ? `${selected.length} signal${selected.length > 1 ? "s" : ""} selected`
                  : "Select signals"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="min-w-[280px] p-0">
            <SignalTree
              signals={signalNames.map((id) => ({ id }))}
              isSelected={(id) => selected.includes(id)}
              onSelect={onToggleSignal}
            />
          </PopoverContent>
        </Popover>
        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((id) => (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onToggleSignal(id)}
              >
                {id}
                <X className="ml-1 h-3 w-3 text-muted-foreground" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">
          Y axis
        </div>
        <div className="flex gap-1 rounded-md border border-neutral-800 p-1">
          {[
            { label: "Raw", value: false },
            { label: "Normalized", value: true },
          ].map((opt) => (
            <Button
              key={opt.label}
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 flex-1 text-xs",
                normalized === opt.value &&
                  "bg-gradient-to-br from-gr-pink to-gr-purple text-white",
              )}
              onClick={() => onNormalizedChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase text-neutral-500">
          New session from crop
        </div>
        <div className="mb-2 text-xs text-neutral-400">{cropLabel}</div>
        <div className="flex gap-2">
          <Input
            placeholder="Session name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!name || !canCreate}
            onClick={() => {
              onCreateSession(name);
              setName("");
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
