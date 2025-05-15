import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import SignalWidget from "@/components/widgets/SignalWidget";
import { GR_COLORS, MAPBOX_ACCESS_TOKEN } from "@/consts/config";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface MapComponentProps {
  data: any;
  currentSignals: any;
  showCompass?: boolean;
  showSpeed?: boolean;
  followVehicle?: boolean;
}

function MapComponent({
  data,
  currentSignals,
  showCompass = true,
  showSpeed = true,
  followVehicle = false,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const polylineSource = useRef<mapboxgl.GeoJSONSource | null>(null);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v10",
      zoom: 13,
      attributionControl: false,
    });

    // Add polyline source and layer after map loads
    map.current.on("load", () => {
      if (!map.current) return;

      // Add the source
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      // Add the main line layer
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": GR_COLORS.PINK,
          "line-width": 4,
          "line-opacity": 0.75,
        },
      });

      // Store reference to source for updates
      polylineSource.current = map.current.getSource(
        "route",
      ) as mapboxgl.GeoJSONSource;
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update polyline based on current time
  useEffect(() => {
    if (!map.current || !polylineSource.current || !data || data.length === 0)
      return;

    // Filter points up to current time
    const currentTime = currentSignals.produced_at;
    console.log("Current time:", currentTime);

    const coordinates = data
      .filter(
        (point: any) =>
          point.mobile_latitude &&
          point.mobile_longitude &&
          point.produced_at <= currentTime,
      )
      .map(
        (point: any) =>
          [point.mobile_longitude, point.mobile_latitude] as [number, number],
      );

    console.log("Filtered coordinates:", coordinates);

    // Only update if we have coordinates
    if (coordinates.length > 0) {
      console.log("Updating polyline with coordinates");
      polylineSource.current.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      });
    } else {
      console.log("No coordinates to display");
    }
  }, [data, currentSignals.produced_at]);

  // Update map when initial coordinates are received
  useEffect(() => {
    if (!map.current) return;

    const lat = data[0].mobile_latitude;
    const lng = data[0].mobile_longitude;

    if (lat && lng) {
      // Update map center
      map.current.flyTo({
        center: [lng, lat],
        animate: true,
        zoom: 16,
        speed: 1.2,
        curve: 1.42,
        essential: true,
        duration: 1000,
        easing: (t) => {
          // Ease in-out cubic function
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        },
      });
    }
  }, [data]);

  // Update marker position
  useEffect(() => {
    if (!map.current) return;

    const lat = currentSignals.mobile_latitude;
    const lng = currentSignals.mobile_longitude;
    const heading = currentSignals.mobile_heading;

    if (lat && lng) {
      if (followVehicle) {
        map.current.flyTo({
          center: [lng, lat],
          bearing: heading,
          animate: true,
          zoom: 16,
          speed: 1.2,
          curve: 1.42,
          essential: true,
          duration: 1000,
          easing: (t) => {
            // Ease in-out cubic function
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          },
        });
      }
      // Update or create marker
      if (!marker.current) {
        marker.current = new mapboxgl.Marker(vehicleMarker())
          .setLngLat([lng, lat])
          .addTo(map.current);
      } else {
        marker.current.setLngLat([lng, lat]);
      }
      if (followVehicle) {
        marker.current.setRotation(0);
      } else {
        marker.current.setRotation(heading);
      }
    }
  }, [currentSignals]);

  const vehicleMarker = () => {
    const el = document.createElement("div");
    el.className = "vehicle-marker";
    el.style.width = "40px";
    el.style.height = "40px";
    el.style.borderRadius = "50%";
    el.style.backgroundImage = "url('/icons/gps-marker-light.png')";
    el.style.backgroundSize = "cover";
    return el;
  };

  const getCompassString = () => {
    const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round((currentSignals.mobile_heading || 0) / 45) % 8;
    return compass[index];
  };

  const CompassDisplay = () => {
    return (
      <div
        className="rounded-md bg-card p-4 text-center opacity-80"
        style={{ width: "130px" }}
      >
        <h4>
          {(currentSignals.mobile_heading || 0).toFixed(1)}°{" "}
          {getCompassString()}
        </h4>
      </div>
    );
  };

  const SpeedDisplay = () => {
    return (
      <div className="flex items-center rounded-md bg-card p-4 text-center opacity-80">
        <div style={{ width: "50px" }}>
          <h1>{((currentSignals.mobile_speed || 0) * 2.23694).toFixed(0)}</h1>
          <div>MPH</div>
        </div>
        <div
          className="mx-2 border-l border-gray-400"
          style={{ height: "50px" }}
        ></div>
        <div style={{ width: "50px" }}>
          <h1>{((currentSignals.mobile_speed || 0) * 3.6).toFixed(0)}</h1>
          <div>KMPH</div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
      {showCompass && (
        <div className="absolute" style={{ top: "12px", left: "12px" }}>
          <CompassDisplay />
        </div>
      )}
      {showSpeed && (
        <div className="absolute" style={{ bottom: "12px", right: "12px" }}>
          <SpeedDisplay />
        </div>
      )}
    </div>
  );
}

interface MapWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
  showCompass?: boolean;
  showSpeed?: boolean;
  followVehicle?: boolean;
}

export default function MapWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
  showCompass = true,
  showSpeed = true,
  followVehicle = false,
}: MapWidgetProps) {
  const signals = [
    "mobile_heading",
    "mobile_latitude",
    "mobile_longitude",
    "mobile_speed",
  ];

  return (
    <SignalWidget
      vehicle_id={vehicle_id}
      start_time={start_time}
      end_time={end_time}
      current_millis={current_millis}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      width={600}
      height={400}
    >
      {(data, currentSignals) => (
        <MapComponent
          data={data}
          currentSignals={currentSignals}
          showCompass={showCompass}
          showSpeed={showSpeed}
          followVehicle={followVehicle}
        />
      )}
    </SignalWidget>
  );
}
