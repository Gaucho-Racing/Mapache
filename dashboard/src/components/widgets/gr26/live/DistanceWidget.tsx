import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import LiveWidget from "@/components/widgets/LiveWidget";
import { Button } from "@/components/ui/button";
import { Signal } from "@/models/signal";

interface DistanceWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

const EARTH_RADIUS_M = 6371000;

// Great-circle distance between two lat/lon points in meters.
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function DistanceTracker({
  lat,
  lon,
  lastMessageTime,
}: {
  lat: number;
  lon: number;
  lastMessageTime: number;
}) {
  const [distanceM, setDistanceM] = useState(0);
  const prevPoint = useRef<{ lat: number; lon: number } | null>(null);
  // Track the timestamp of the sample we last integrated so we only
  // accumulate on genuinely new GPS fixes.
  const lastProcessed = useRef(0);

  useEffect(() => {
    if (lastMessageTime === lastProcessed.current) return;
    if (lat === 0 && lon === 0) return;
    lastProcessed.current = lastMessageTime;

    const prev = prevPoint.current;
    if (prev) {
      const step = haversine(prev.lat, prev.lon, lat, lon);
      // Ignore obviously bogus jumps (e.g. dropped fix snapping to 0,0).
      if (step < 1000) {
        setDistanceM((d) => d + step);
      }
    }
    prevPoint.current = { lat, lon };
  }, [lat, lon, lastMessageTime]);

  const reset = () => {
    setDistanceM(0);
    prevPoint.current = lat === 0 && lon === 0 ? null : { lat, lon };
  };

  const km = distanceM / 1000;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
      <h1 className="text-2xl font-bold">Distance Travelled</h1>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-5xl font-bold">{km.toFixed(3)}</span>
        <span className="text-xl text-muted-foreground">km</span>
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        {distanceM.toFixed(1)} m
      </p>
      <Button variant="outline" size="sm" onClick={reset} className="mt-2">
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}

export default function DistanceWidget({
  vehicle_id,
  showDeltaBanner = false,
}: DistanceWidgetProps) {
  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={["dgps_gps_latitude", "dgps_gps_longitude"]}
      showDeltaBanner={showDeltaBanner}
      alwaysShowData={true}
      width={400}
      height={300}
    >
      {(
        _: Map<string, Signal[]>,
        currentSignals: Map<string, Signal>,
        lastMessageTime: number,
      ) => {
        const lat = currentSignals.get("dgps_gps_latitude")?.value ?? 0;
        const lon = currentSignals.get("dgps_gps_longitude")?.value ?? 0;
        return (
          <DistanceTracker
            lat={lat}
            lon={lon}
            lastMessageTime={lastMessageTime}
          />
        );
      }}
    </LiveWidget>
  );
}
