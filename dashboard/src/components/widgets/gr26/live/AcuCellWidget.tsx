import { useMemo } from "react";
import { X } from "lucide-react";
import LiveWidget from "@/components/widgets/LiveWidget";
import { Card } from "@/components/ui/card";

interface BmsCellWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
  onRemove?: () => void;
}

const MODULES = 5;
const COLS = 4;
const ROWS = 14;
const PAIRS_PER_MODULE = ROWS * 2; // 28 sensor pairs per module

const maxVoltage = 4.2;

const getVoltageBg = (v: number) => {
  const f = v / maxVoltage;
  if (f < 0.2) return "rgba(239,68,68,0.3)";
  if (f < 0.4) return "rgba(250,204,21,0.3)";
  return "rgba(74,222,128,0.3)";
};

const getTempColor = (t: number) => {
  if (t < 45) return "#4ade80";
  if (t < 60) return "#facc15";
  return "#ef4444";
};

interface ModuleCellsProps {
  vehicle_id: string;
  moduleIndex: number;
}

function ModuleCells({ vehicle_id, moduleIndex }: ModuleCellsProps) {
  const pairOffset = moduleIndex * PAIRS_PER_MODULE;
  const signals = useMemo(() => {
    const s: string[] = [];
    for (let i = 0; i < PAIRS_PER_MODULE; i++) {
      s.push(`bcu_cell_${pairOffset + i}_voltage`);
      s.push(`bcu_cell_${pairOffset + i}_temp`);
    }
    return s;
  }, [pairOffset]);

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={signals}
      dataLength={5}
      showDeltaBanner={false}
      alwaysShowData={true}
      width={COLS * 60}
      height={ROWS * 40 + (ROWS - 1) * 2 + 10}
    >
      {(_, currentSignals) => (
        <div className="h-full w-full p-1">
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 56px)`,
              gridTemplateRows: `repeat(14, 40px)`,
            }}
          >
            {Array.from({ length: PAIRS_PER_MODULE }, (_, pairIdx) => {
              const pairGlobal = pairOffset + pairIdx;
              const v =
                currentSignals.get(`bcu_cell_${pairGlobal}_voltage`)?.value ??
                0;
              const t =
                currentSignals.get(`bcu_cell_${pairGlobal}_temp`)?.value ?? 0;
              const num0 = pairGlobal * 2;
              const num1 = num0 + 1;

              let colStart: number;
              let row: number;
              if (pairIdx < 14) {
                // Left leg: cols 0-1 going down
                colStart = 1; // CSS grid column 1
                row = pairIdx + 1;
              } else {
                // Right leg: cols 3-2 going up
                colStart = 3; // CSS grid column 3
                row = 14 - (pairIdx - 14);
              }

              return (
                <div
                  key={pairIdx}
                  className="flex flex-col items-center justify-center rounded border border-border/50 text-[10px] leading-tight"
                  style={{
                    background: getVoltageBg(v),
                    gridColumn: `${colStart} / span 2`,
                    gridRow: row,
                  }}
                >
                  <span className="text-muted-foreground">
                    {num0}-{num1}
                  </span>
                  <span>{v.toFixed(2)}V</span>
                  <span style={{ color: getTempColor(t) }}>
                    {t.toFixed(0)}°C
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </LiveWidget>
  );
}

export default function BmsCellWidget(props: BmsCellWidgetProps) {
  const { vehicle_id, onRemove } = props;
  return (
    <Card className="bms-widget relative inline-block p-2">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 z-20 rounded-md bg-background/80 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title="Remove BMS Cells"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold">BMS Cells</h1>
        <div className="flex flex-row gap-3 overflow-auto">
          {Array.from({ length: MODULES }, (_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                M{i}
              </span>
              <ModuleCells vehicle_id={vehicle_id} moduleIndex={i} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
