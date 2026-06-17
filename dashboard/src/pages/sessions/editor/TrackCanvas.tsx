import { useCallback, useEffect, useRef } from "react";
import { Point } from "@/models/session";
import { Vec2 } from "@/lib/sessions/intersect";
import { SEGMENT_NAMES } from "@/lib/sessions/segments";

interface TrackCanvasProps {
  points: Point[];
  // segments[n] = list of [x,y] world coords (n: 1=S/F, 2-9 sectors)
  segments: Record<number, Vec2[]>;
  activeSegment: number;
  lapNumbers?: number[];
  // Called with world coordinates when the user clicks to add / remove a point.
  onAddPoint: (world: Vec2) => void;
  onRemovePoint: (world: Vec2) => void;
}

const SEGMENT_COLORS: Record<number, string> = {
  1: "#ff3b3b", // S/F red
  2: "#36c5f0",
  3: "#2eb67d",
  4: "#ecb22e",
  5: "#e105a3",
  6: "#8412fc",
  7: "#ff8c42",
  8: "#00d4b1",
  9: "#c0c0ff",
};

const LAP_PALETTE = [
  "#8412fc",
  "#e105a3",
  "#36c5f0",
  "#2eb67d",
  "#ecb22e",
  "#ff8c42",
];

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
  height: number;
}

function computeTransform(
  points: Point[],
  segments: Record<number, Vec2[]>,
  w: number,
  h: number,
): Transform {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  const consider = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const p of points) consider(p.x, p.y);
  for (const pts of Object.values(segments)) {
    for (const pt of pts) consider(pt[0], pt[1]);
  }

  if (!isFinite(minX)) {
    return { scale: 1, offsetX: w / 2, offsetY: h / 2, height: h };
  }

  const dataW = maxX - minX || 1;
  const dataH = maxY - minY || 1;
  const pad = 0.9;
  const scale = Math.min((w / dataW) * pad, (h / dataH) * pad);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const offsetX = w / 2 - cx * scale;
  const offsetY = h / 2 + cy * scale; // y flipped
  return { scale, offsetX, offsetY, height: h };
}

function worldToScreen(t: Transform, x: number, y: number): [number, number] {
  return [x * t.scale + t.offsetX, t.height - (y * t.scale + (t.height - t.offsetY))];
}

function screenToWorld(t: Transform, sx: number, sy: number): Vec2 {
  const x = (sx - t.offsetX) / t.scale;
  const y = (t.offsetY - sy) / t.scale;
  return [x, y];
}

export default function TrackCanvas({
  points,
  segments,
  activeSegment,
  lapNumbers,
  onAddPoint,
  onRemovePoint,
}: TrackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    height: 0,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const t = computeTransform(points, segments, w, h);
    transformRef.current = t;

    // Track polyline.
    if (points.length > 1) {
      if (lapNumbers && lapNumbers.length === points.length) {
        for (let i = 1; i < points.length; i++) {
          const lap = lapNumbers[i];
          ctx.strokeStyle =
            lap > 0 ? LAP_PALETTE[(lap - 1) % LAP_PALETTE.length] : "#555";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const [x0, y0] = worldToScreen(t, points[i - 1].x, points[i - 1].y);
          const [x1, y1] = worldToScreen(t, points[i].x, points[i].y);
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = "#8412fc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const [sx, sy] = worldToScreen(t, points[0].x, points[0].y);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < points.length; i++) {
          const [x, y] = worldToScreen(t, points[i].x, points[i].y);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Segment lines + endpoints.
    for (let n = 1; n <= 9; n++) {
      const pts = segments[n] ?? [];
      if (pts.length === 0) continue;
      const color = SEGMENT_COLORS[n];
      const isActive = n === activeSegment;

      if (pts.length === 2) {
        const [x0, y0] = worldToScreen(t, pts[0][0], pts[0][1]);
        const [x1, y1] = worldToScreen(t, pts[1][0], pts[1][1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 4 : 2.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        // Label at midpoint.
        ctx.fillStyle = color;
        ctx.font = "11px monospace";
        ctx.fillText(SEGMENT_NAMES[n], (x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6);
      }

      for (const pt of pts) {
        const [x, y] = worldToScreen(t, pt[0], pt[1]);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, isActive ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
        if (isActive) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }, [points, segments, activeSegment, lapNumbers]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(transformRef.current, sx, sy);
    if (e.shiftKey) {
      onRemovePoint(world);
    } else {
      onAddPoint(world);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(
      transformRef.current,
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
    onRemovePoint(world);
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className="h-full w-full cursor-crosshair rounded-md bg-neutral-950"
      />
    </div>
  );
}
