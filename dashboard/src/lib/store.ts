import { initVehicle } from "@/models/car";
import { initUser } from "@/models/user";
import createStore from "react-superstore";

export const [useUser, setUser, getUser] = createStore(initUser);

export const [useVehicle, setVehicle, getVehicle] = createStore(initVehicle);
export const [useVehicleList, setVehicleList, getVehicleList] = createStore([
  initVehicle,
]);

export const [useSidebarExpanded, setSidebarExpanded, getSidebarExpanded] =
  createStore(true);
export const [useSidebarWidth, setSidebarWidth, getSidebarWidth] =
  createStore(275);
