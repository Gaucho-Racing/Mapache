import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import LiveWidget from "@/components/widgets/LiveWidget";
import { GR_COLORS, MAPBOX_ACCESS_TOKEN } from "@/consts/config";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface DgpsPositionWidgetProps {
  vehicle_id: string;
  showDeltaBanner?: boolean;
}

// Build the marker DOM once per mount. Mapbox doesn't have Leaflet's
// divIcon factory; the marker is just a plain element you hand it.
function createMarkerElement() {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "50%";
  el.style.background = GR_COLORS.PINK;
  el.style.border = "2px solid #fff";
  el.style.boxShadow = "0 0 8px rgba(225,5,163,0.5)";
  return el;
}

function DgpsMap({ lat, lon }: { lat: number; lon: number }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v10",
      // Mapbox uses [lng, lat] — the inverse of Leaflet's [lat, lng].
      // Get this wrong and the map starts off the coast of Africa.
      center: [lon || 0, lat || 0],
      zoom: 17,
      attributionControl: false,
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !lat || !lon) return;

    // Easing match for the prior Leaflet `setView({ animate, duration })` —
    // mapbox's flyTo wraps both panning and zoom in a single cubic ease,
    // so the marker glides instead of teleporting on every sample.
    map.current.easeTo({
      center: [lon, lat],
      duration: 500,
    });

    if (!marker.current) {
      marker.current = new mapboxgl.Marker({ element: createMarkerElement() })
        .setLngLat([lon, lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([lon, lat]);
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
