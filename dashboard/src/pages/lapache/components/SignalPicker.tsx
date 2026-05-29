import { NormMode } from "@/models/lapache";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <Select
          value={latField || undefined}
          onValueChange={(v) => onChange({ latField: v, lonField, normMode })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select signal" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {signalNames.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-neutral-400">Longitude signal</Label>
        <Select
          value={lonField || undefined}
          onValueChange={(v) => onChange({ latField, lonField: v, normMode })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select signal" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {signalNames.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
