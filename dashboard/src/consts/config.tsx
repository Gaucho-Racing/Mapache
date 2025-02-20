import { Vehicle, initVehicle } from "@/models/car";
import { User, initUser } from "@/models/user";

export const currentUser: User = initUser;
export const currentVehicle: Vehicle = initVehicle;

export const MAPACHE_API_URL =
  import.meta.env.VITE_MAPACHE_API_URL ??
  "http://hamilton-ec2.gauchoracing.com:10310";

export const MAPACHE_WS_URL =
  import.meta.env.VITE_MAPACHE_WS_URL ??
  "ws://hamilton-ec2.gauchoracing.com:10310";
