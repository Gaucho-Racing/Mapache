import { User, initUser } from "@/models/user";

export var currentUser: User = initUser;

export const MAPACHE_API_URL =
  import.meta.env.VITE_MAPACHE_API_URL ?? "http://localhost:7001";

export const MQTT_HOST = import.meta.env.VITE_MQTT_HOST ?? "localhost";
export const MQTT_PORT = import.meta.env.VITE_MQTT_PORT ?? "9001";
