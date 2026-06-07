import LiveWidget from "@/components/widgets/LiveWidget";
import { GR_COLORS } from "@/consts/config";
import { Signal } from "@/models/signal";

interface WheelSpeedWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

// Conversion factor from dti_erpm to wheel speed.
// ERPM → mechanical RPM (÷ pole pairs) → wheel RPM (÷ gear ratio) → speed (× wheel circumference)
const ERPM_TO_WHEEL_SPEED = 0.001706;

export default function WheelSpeedWidget({
  vehicle_id,
  showDeltaBanner = false,
}: WheelSpeedWidgetProps) {
  const signals = ["dti_erpm"];

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={250}
      height={160}
    >
      {(_data: Map<string, Signal[]>, currentSignals: Map<string, Signal>) => {
        const erpm = currentSignals.get("dti_erpm")?.value ?? 0;
        const wheelSpeed = erpm * ERPM_TO_WHEEL_SPEED * 10;

        return (
          <div className="flex h-full w-full flex-col items-center justify-center p-4">
            <h1 className="mb-1 text-lg font-bold">Wheel Speed</h1>
            <p
              className="text-4xl font-bold tabular-nums"
              style={{ color: GR_COLORS.PINK }}
            >
              {wheelSpeed.toFixed(1)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ERPM: {erpm.toFixed(0)}
            </p>
          </div>
        );
      }}
    </LiveWidget>
  );
}
