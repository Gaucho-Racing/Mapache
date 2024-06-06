import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Mobile, initMobile } from "@/models/gr24/mobile";
import { MAPACHE_WS_URL } from "@/consts/config";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapSpeedLiveWidget() {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/mobile`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);

  const mapContainer = useRef(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const initialLat = 42.35;
  const initialLong = -71.06;
  let mapMarkers: mapboxgl.Marker[] = [];

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
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
      setMessageJson(data);
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

  const getCompassString = () => {
    const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(messageJson.heading / 45) % 8;
    return compass[index];
  };

  const CompassDisplay = () => {
    return (
      <div
        className="rounded-md bg-card p-4 text-center opacity-80"
        style={{ width: "130px" }}
      >
        <h4>
          {messageJson.heading.toFixed(1)}° {getCompassString()}
        </h4>
      </div>
    );
  };

  const SpeedDisplay = () => {
    return (
      <div className="flex items-center rounded-md bg-card p-4 text-center opacity-80">
        <div style={{ width: "50px" }}>
          <h1>{(messageJson.speed * 2.23694).toFixed(0)}</h1>
          <div>MPH</div>
        </div>
        <div
          className="mx-2 border-l border-gray-400"
          style={{ height: "50px" }}
        ></div>
        <div style={{ width: "50px" }}>
          <h1>{(messageJson.speed * 3.6).toFixed(0)}</h1>
          <div>KMPH</div>
        </div>
      </div>
    );
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
              <div className="absolute" style={{ top: "12px", left: "12px" }}>
                <CompassDisplay />
              </div>
              <div
                className="absolute"
                style={{ bottom: "12px", right: "12px" }}
              >
                <SpeedDisplay />
              </div>
            </div>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default MapSpeedLiveWidget;
