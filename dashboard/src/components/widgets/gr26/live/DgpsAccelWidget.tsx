import LiveWidget from "@/components/widgets/LiveWidget";
import { useRef } from "react";

interface DgpsAccelWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

const G = 9.80665;
const MAX_G = 3;

export default function DgpsAccelWidget({
  vehicle_id,
  showDeltaBanner = false,
}: DgpsAccelWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = (
    trail: { y: number; z: number; age: number }[],
    curY: number,
    curZ: number,
  ) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W === 0 || H === 0) return;

    const scaleFactor = 1; // <-- adjust this to change plot size (0-1)
    const size = Math.floor(Math.min(W, H) * scaleFactor);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = size;
    ctx.clearRect(0, 0, S, S);

    const cx = S / 2;
    const cy = S / 2;
    const margin = S * 0.08;
    const scale = (S / 2 - margin) / MAX_G;

    // Grid rings
    for (let g = 1; g <= MAX_G; g += 1) {
      const r = g * scale;
      ctx.strokeStyle = "#333";
      ctx.lineWidth = Math.max(0.5, S / 400);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.stroke();

      const fontSize = Math.max(9, Math.floor(S / 25));
      ctx.fillStyle = "#555";
      ctx.font = `${fontSize}px sans-serif`;
      ctx.save();
      ctx.translate(cx + r + 6, cy + 12);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.fillText(g + "g", 0, 0);
      ctx.restore();
    }

    // Cross axes
    ctx.strokeStyle = "#444";
    ctx.lineWidth = Math.max(1, S / 200);
    ctx.beginPath();
    ctx.moveTo(margin, cy);
    ctx.lineTo(S - margin, cy);
    ctx.moveTo(cx, margin);
    ctx.lineTo(cx, S - margin);
    ctx.stroke();

    // Trail line
    if (trail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const alpha = 1 - trail[i].age / 10; // fade over 10 seconds
        if (alpha <= 0) continue;
        const px = cx + (trail[i].z / G) * scale;
        const py = cy - (trail[i].y / G) * scale;
        const cpx = Math.max(margin, Math.min(S - margin, px));
        const cpy = Math.max(margin, Math.min(S - margin, py));
        if (i === 0) {
          ctx.moveTo(cpx, cpy);
        } else {
          ctx.strokeStyle = `rgba(225,5,163,${Math.max(0.05, alpha * 0.5)})`;
          ctx.lineWidth = Math.max(1, S / 200);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cpx, cpy);
        }
      }
    }

    // Current dot (uses live values, always on top)
    {
      const dotX = cx + (curZ / G) * scale;
      const dotY = cy - (curY / G) * scale;
      const cX = Math.max(margin - 5, Math.min(S - margin + 5, dotX));
      const cY = Math.max(margin - 5, Math.min(S - margin + 5, dotY));

      // Dot glow
      const glowR = Math.max(4, S / 30);
      ctx.fillStyle = "rgba(225,5,163,0.25)";
      ctx.beginPath();
      ctx.arc(cX, cY, glowR, 0, 2 * Math.PI);
      ctx.fill();

      // Dot
      const dotR = Math.max(2, S / 70);
      ctx.fillStyle = "#e105a3";
      ctx.beginPath();
      ctx.arc(cX, cY, dotR, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={["dgps_x_acc", "dgps_y_acc", "dgps_z_acc"]}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={500}
      height={500}
      className="aspect-square"
    >
      {(data, currentSignals) => {
        const x = currentSignals.get("dgps_x_acc")?.value ?? 0;
        const y = currentSignals.get("dgps_y_acc")?.value ?? 0;
        const z = currentSignals.get("dgps_z_acc")?.value ?? 0;

        // Build trail: pair y/z values by timestamp, last 10 seconds
        const now = Date.now();
        const yData = data.get("dgps_y_acc") || [];
        const zData = data.get("dgps_z_acc") || [];

        const yMap = new Map<number, number>();
        yData.forEach((s) => {
          const t = new Date(s.produced_at).getTime();
          if (now - t <= 10_000) yMap.set(t, s.value);
        });

        const trail: { y: number; z: number; age: number }[] = [];
        zData.forEach((s) => {
          const t = new Date(s.produced_at).getTime();
          const age = (now - t) / 1000;
          if (age <= 10 && yMap.has(t)) {
            trail.push({ y: yMap.get(t)!, z: s.value, age });
          }
        });
        trail.sort((a, b) => a.age - b.age); // oldest first

        draw(trail, y, z);

        return (
          <div className="flex h-full w-full flex-col p-3">
            <h1 className="mb-1 text-lg font-bold">DGPS Acceleration</h1>
            <div
              ref={containerRef}
              className="flex flex-1 items-center justify-center"
            >
              <canvas ref={canvasRef} />
            </div>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span>X: {(x / G).toFixed(3)}g</span>
              <span>Y: {(y / G).toFixed(3)}g</span>
              <span>Z: {(z / G).toFixed(3)}g</span>
            </div>
          </div>
        );
      }}
    </LiveWidget>
  );
}
