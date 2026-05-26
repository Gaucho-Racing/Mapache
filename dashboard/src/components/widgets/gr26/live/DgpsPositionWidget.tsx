import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LiveWidget from "@/components/widgets/LiveWidget";
import { GR_COLORS } from "@/consts/config";

interface DgpsPositionWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

function createMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${GR_COLORS.PINK};border:2px solid #fff;
      box-shadow:0 0 8px rgba(225,5,163,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function DgpsMap({ lat, lon }: { lat: number; lon: number }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: false,
    }).setView([lat || 0, lon || 0], 17);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !lat || !lon) return;

    map.current.setView([lat, lon], map.current.getZoom(), {
      animate: true,
      duration: 0.5,
    });

    if (!marker.current) {
      marker.current = L.marker([lat, lon], {
        icon: createMarkerIcon(),
      }).addTo(map.current);
    } else {
      marker.current.setLatLng([lat, lon]);
    }
  }, [lat, lon]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="h-full w-full rounded-lg"
        style={{ zIndex: 0 }}
      />
      {/* Coords badge */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-background/80 px-2.5 py-1.5 font-mono text-xs text-white shadow-lg">
        <span>{lat.toFixed(6)}°</span>
        <span className="mx-1.5 text-muted-foreground">|</span>
        <span>{lon.toFixed(6)}°</span>
      </div>
    </div>
  );
}

export default function DgpsPositionWidget({
  vehicle_id,
}: DgpsPositionWidgetProps) {
  return (
    <LiveWidget
      vehicle_id={vehicle_id}
      signals={["dgps_gps_latitude", "dgps_gps_longitude"]}
      showDeltaBanner={false}
      alwaysShowData={true}
      width={600}
      height={420}
    >
      {(_, currentSignals, lastMessageTime) => {
        const lat = currentSignals.get("dgps_gps_latitude")?.value ?? 0;
        const lon = currentSignals.get("dgps_gps_longitude")?.value ?? 0;
        const delta = Math.round(lastMessageTime - Date.now());
        const deltaColor =
          Math.abs(delta) < 500 ? "text-neutral-400" : "text-yellow-500";

        return (
          <div className="relative h-full w-full px-3 pb-3 pt-8">
            <p className={`absolute left-3 top-2 z-10 text-xs ${deltaColor}`}>
              Delta: {delta > 0 ? "+" : ""}
              {delta}ms
            </p>
            <DgpsMap lat={lat} lon={lon} />
          </div>
        );
      }}
    </LiveWidget>
  );
}
