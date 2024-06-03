import { Vehicle, initVehicle } from "@/models/car";
import { User, initUser } from "@/models/user";

export const currentUser: User = initUser;

export const currentCar: Vehicle = initVehicle;

export const MAPACHE_API_URL =
  import.meta.env.VITE_MAPACHE_API_URL ?? "http://localhost:10310";

export const MAPACHE_WS_URL =
  import.meta.env.VITE_MAPACHE_WS_URL ?? "ws://localhost:10310";
