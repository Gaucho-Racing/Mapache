import { useCallback, useEffect, useRef, useState } from "react";
import { Point } from "@/models/session";
import { Vec2 } from "@/lib/sessions/intersect";
import { SEGMENT_NAMES } from "@/lib/sessions/segments";
import { MAPBOX_ACCESS_TOKEN } from "@/consts/config";

export type BaseMap = "satellite" | "streets" | "none";

interface TrackCanvasProps {
  points: Point[];
  // segments[n] = list of [x,y] world coords (n: 1=S/F, 2-9 sectors)
  segments: Record<number, Vec2[]>;
  activeSegment: number;
  lapNumbers?: number[];
  baseMap: BaseMap;
  // Lat/lon bounding box of the currently-shown points.
  geoBounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } | null;
  // Called with world coordinates when the user clicks to add / remove a point.
  onAddPoint: (world: Vec2) => void;
  onRemovePoint: (world: Vec2) => void;
}

const MAPBOX_MAX_DIM = 1280;

const BASE_MAP_STYLE: Record<Exclude<BaseMap, "none">, string> = {
  satellite: "mapbox/satellite-v9",
  streets: "mapbox/streets-v12",
};

// Mapbox Static Images API for a geographic bbox. Passing a width/height whose
// aspect ratio matches the bbox keeps Mapbox from expanding the bbox to fill a
// mismatched canvas, which is what makes the image line up with the track.
function staticImageUrl(
  style: string,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  w: number,
  h: number,
): string {
  const W = Math.max(1, Math.min(MAPBOX_MAX_DIM, Math.round(w)));
  const H = Math.max(1, Math.min(MAPBOX_MAX_DIM, Math.round(h)));
  const bbox = `[${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}]`;
  return `https://api.mapbox.com/styles/v1/${style}/static/${bbox}/${W}x${H}@2x?access_token=${MAPBOX_ACCESS_TOKEN}&attribution=false&logo=false`;
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

interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function worldBoundsOf(
  points: Point[],
  segments: Record<number, Vec2[]>,
): WorldBounds | null {
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
  if (!isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

function computeTransform(
  wb: WorldBounds | null,
  w: number,
  h: number,
): Transform {
  if (!wb) {
    return { scale: 1, offsetX: w / 2, offsetY: h / 2, height: h };
  }
  const dataW = wb.maxX - wb.minX || 1;
  const dataH = wb.maxY - wb.minY || 1;
  const pad = 0.9;
  const scale = Math.min((w / dataW) * pad, (h / dataH) * pad);
  const cx = (wb.minX + wb.maxX) / 2;
  const cy = (wb.minY + wb.maxY) / 2;
  const offsetX = w / 2 - cx * scale;
  const offsetY = h / 2 + cy * scale; // y flipped
  return { scale, offsetX, offsetY, height: h };
}

function worldToScreen(t: Transform, x: number, y: number): [number, number] {
  return [x * t.scale + t.offsetX, t.offsetY - y * t.scale];
}

function screenToWorld(t: Transform, sx: number, sy: number): Vec2 {
  const x = (sx - t.offsetX) / t.scale;
  const y = (t.offsetY - sy) / t.scale;
  return [x, y];
}

// Linear map from the world bbox (any of the normalization projections) to the
// geographic bbox of the same points. Used to figure out which lat/lon the
// canvas corners correspond to so the base map can cover the whole viewport.
function canvasGeoBounds(
  t: Transform,
  wb: WorldBounds,
  geo: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  w: number,
  h: number,
) {
  const dx = wb.maxX - wb.minX || 1;
  const dy = wb.maxY - wb.minY || 1;
  const lonAt = (x: number) =>
    geo.minLon + ((x - wb.minX) / dx) * (geo.maxLon - geo.minLon);
  const latAt = (y: number) =>
    geo.minLat + ((y - wb.minY) / dy) * (geo.maxLat - geo.minLat);

  const [xTL, yTL] = screenToWorld(t, 0, 0);
  const [xBR, yBR] = screenToWorld(t, w, h);
  return {
    minLon: lonAt(Math.min(xTL, xBR)),
    maxLon: lonAt(Math.max(xTL, xBR)),
    minLat: latAt(Math.min(yTL, yBR)),
    maxLat: latAt(Math.max(yTL, yBR)),
  };
}

export default function TrackCanvas({
  points,
  segments,
  activeSegment,
  lapNumbers,
  baseMap,
  geoBounds,
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
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null);

  // Track the container size so both the draw and the base-map fetch react to
  // resizes (which change the world->screen transform, hence the bbox).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const { w, h } = size;
    if (!canvas || w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const wb = worldBoundsOf(points, segments);
    const t = computeTransform(wb, w, h);
    transformRef.current = t;

    // Base map underlay fills the whole canvas; it is fetched for exactly the
    // canvas's geographic extent so it stays registered with the track.
    if (baseMap !== "none" && baseImg) {
      ctx.drawImage(baseImg, 0, 0, w, h);
    }

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
  }, [points, segments, activeSegment, lapNumbers, baseMap, baseImg, size]);

  // Fetch the base-map image whenever the view, size, or style change. The
  // image covers the canvas's geographic extent, so it always fills the canvas.
  useEffect(() => {
    setBaseImg(null);
    const { w, h } = size;
    if (
      baseMap === "none" ||
      !geoBounds ||
      !MAPBOX_ACCESS_TOKEN ||
      points.length === 0 ||
      w === 0 ||
      h === 0
    ) {
      return;
    }
    const wb = worldBoundsOf(points, segments);
    if (!wb) return;
    const t = computeTransform(wb, w, h);
    const bbox = canvasGeoBounds(t, wb, geoBounds, w, h);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBaseImg(img);
    img.src = staticImageUrl(BASE_MAP_STYLE[baseMap], bbox, w, h);
    return () => {
      img.onload = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMap, geoBounds, points, size]);

  useEffect(() => {
    draw();
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
