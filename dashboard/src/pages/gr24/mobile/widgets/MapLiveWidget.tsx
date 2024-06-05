import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapLiveWidget() {
  const [socketUrl] = React.useState("ws://localhost:10310/ws/gr24/mobile");
  const { lastMessage, readyState } = useWebSocket(socketUrl);

  const mapContainer = useRef(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const initialLat = 42.35;
  const initialLong = -71.06;
  let mapMarkers: mapboxgl.Marker[] = [];

  useEffect(() => {
    if (!mapContainer.current || map.current) return; // Ensure container is not null and map is only initialized once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v10",
      center: [initialLat, initialLong],
      zoom: 13,
      attributionControl: false,
    });
  });

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      if (map.current) {
        if (!map.current.isMoving()) {
          map.current.flyTo({
            center: [data.longitude, data.latitude],
            animate: true,
            zoom: 16,
            speed: 4,
            bearing: data.heading,
          });
          removeMarkers();
          const marker = new mapboxgl.Marker(vehicleMarker())
            .setLngLat([data.longitude, data.latitude])
            .addTo(map.current);
          mapMarkers.push(marker);
        }
      }
    }
  }, [lastMessage]);

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

  const removeMarkers = () => {
    mapMarkers.forEach((marker) => marker.remove());
    console.log("Removing markers");
    mapMarkers = [];
  };

  const LoadingComponent = () => {
    if (readyState === ReadyState.CONNECTING) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <p className="mt-2 text-neutral-400">Connecting...</p>
        </div>
      );
    } else if (readyState === ReadyState.CLOSED) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <FontAwesomeIcon
            icon={faCircleXmark}
            className="mr-2 h-8 w-8 text-red-500"
          />
          <p className="mt-2 text-neutral-400">Connection Closed</p>
        </div>
      );
    } else {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        </div>
      );
    }
  };

  return (
    <>
      <div className="h-full w-full">
        {lastMessage ? (
          <div className="">
            <div
              className="relative flex w-full flex-col items-center"
              style={{ height: "300px" }}
            >
              <div
                ref={mapContainer}
                className="map-container absolute left-0 top-0 w-full rounded-lg"
                style={{ height: "300px" }}
              />
            </div>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default MapLiveWidget;
