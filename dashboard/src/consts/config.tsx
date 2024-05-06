import { User, initUser } from "@/models/user";

export const currentUser: User = initUser;

export const MAPACHE_API_URL =
  import.meta.env.VITE_MAPACHE_API_URL ?? "http://localhost:7001";

export const MAPACHE_WS_URL =
  import.meta.env.VITE_MAPACHE_WS_URL ?? "http://localhost:7001";
