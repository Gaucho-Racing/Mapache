import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { NormMode } from "@/models/session";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignalTree } from "@/components/signals/SignalTree";

interface SignalPickerProps {
  signalNames: string[];
  latField: string;
  lonField: string;
  normMode: NormMode;
  onChange: (next: {
    latField: string;
    lonField: string;
    normMode: NormMode;
  }) => void;
}

interface SignalSelectProps {
  signalNames: string[];
  value: string;
  onSelect: (id: string) => void;
}

function SignalSelect({ signalNames, value, onSelect }: SignalSelectProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value || "Select signal"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[280px] p-0">
        <SignalTree
          signals={signalNames.map((id) => ({ id }))}
          isSelected={(id) => id === value}
          onSelect={(id) => {
            onSelect(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default function SignalPicker({
  signalNames,
  latField,
  lonField,
  normMode,
  onChange,
}: SignalPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-neutral-400">Latitude signal</Label>
        <SignalSelect
          signalNames={signalNames}
          value={latField}
          onSelect={(v) => onChange({ latField: v, lonField, normMode })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-neutral-400">Longitude signal</Label>
        <SignalSelect
          signalNames={signalNames}
          value={lonField}
          onSelect={(v) => onChange({ latField, lonField: v, normMode })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-neutral-400">Normalization</Label>
        <Select
          value={normMode}
          onValueChange={(v) =>
            onChange({ latField, lonField, normMode: v as NormMode })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(NormMode).map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
