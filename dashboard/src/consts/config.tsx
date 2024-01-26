import { User, initUser } from "@/models/user";

export var currentUser: User = initUser;

export const MAPACHE_API_URL =
  import.meta.env.VITE_MAPACHE_API_URL ?? "http://localhost:7001";
