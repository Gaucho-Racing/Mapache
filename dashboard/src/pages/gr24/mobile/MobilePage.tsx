import Layout from "@/components/Layout";
import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { Mobile, initMobile } from "@/models/gr24/mobile";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MobilePage() {
  const [socketUrl] = React.useState("ws://localhost:10310/ws/gr24/mobile");
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);

  const mapContainer = useRef(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const initialLat = 42.35;
  const initialLong = -71.06;

  useEffect(() => {
    if (!mapContainer.current || map.current) return; // Ensure container is not null and map is only initialized once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
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
          const marker = new mapboxgl.Marker()
            .setLngLat([data.longitude, data.latitude])
            .addTo(map.current);
        }
      }
    }
  }, [lastMessage]);

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

  return (
    <>
      <Layout activeTab="mobile">
        <h1>Mobile</h1>
        <p className="mt-2 text-neutral-400">Phone on car!</p>
        <div className="flex flex-wrap"></div>
        <div
          className="relative mt-4 flex w-full flex-col items-center"
          style={{ height: "50vh" }}
        >
          <div
            ref={mapContainer}
            className="map-container absolute left-0 top-0 w-full rounded-lg"
            style={{ height: "50vh" }}
          />
          <div className="absolute" style={{ top: "12px", left: "12px" }}>
            <CompassDisplay />
          </div>
          <div className="absolute" style={{ bottom: "12px", right: "12px" }}>
            <SpeedDisplay />
          </div>
        </div>
        <div className="m-4 flex w-full flex-row text-lg">
          <div className="flex-1">
            <div className="flex">
              <div className="pr-2 font-semibold">Latitude:</div>
              <div className="font-semibold text-gray-400">
                {messageJson.latitude.toFixed(6)}
              </div>
            </div>
            <div className="mt-1 flex">
              <div className="pr-2 font-semibold">Longitude:</div>
              <div className="font-semibold text-gray-400">
                {messageJson.longitude.toFixed(6)}
              </div>
            </div>
            <div className="mt-1 flex">
              <div className="pr-2 font-semibold">Altitude:</div>
              <div className="font-semibold text-gray-400">
                {messageJson.altitude.toFixed(6)} m
              </div>
            </div>
            <div className="mt-1 flex">
              <div className="pr-2 font-semibold">Heading:</div>
              <div className="font-semibold text-gray-400">
                {messageJson.heading.toFixed(6)} °
              </div>
            </div>
            <div className="mt-1 flex">
              <div className="pr-2 font-semibold">Speed:</div>
              <div className="font-semibold text-gray-400">
                {messageJson.speed} m/s
              </div>
            </div>
            <div className="mt-1 flex">
              <div className="pr-2 font-semibold">Last Update:</div>
              <div className="font-semibold text-gray-400">
                {new Date(messageJson.created_at).toISOString()}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex">
              <div className="pr-2 font-semibold">Accelerometer:</div>
              <div className="font-semibold text-gray-400">
                <div>x: {messageJson.accelerometer_x.toFixed(8)}</div>
                <div>y: {messageJson.accelerometer_y.toFixed(8)}</div>
                <div>z: {messageJson.accelerometer_z.toFixed(8)}</div>
              </div>
            </div>
            <div className="flex">
              <div className="pr-2 font-semibold">Gyroscope:</div>
              <div className="font-semibold text-gray-400">
                <div>x: {messageJson.gyroscope_x.toFixed(8)}</div>
                <div>y: {messageJson.gyroscope_y.toFixed(8)}</div>
                <div>z: {messageJson.gyroscope_z.toFixed(8)}</div>
              </div>
            </div>
            <div className="flex">
              <div className="pr-2 font-semibold">Magnetometer:</div>
              <div className="font-semibold text-gray-400">
                <div>x: {messageJson.magnetometer_x.toFixed(8)}</div>
                <div>y: {messageJson.magnetometer_y.toFixed(8)}</div>
                <div>z: {messageJson.magnetometer_z.toFixed(8)}</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export default MobilePage;
