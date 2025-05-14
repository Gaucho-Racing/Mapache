import { initVehicle } from "@/models/vehicle";
import { initUser } from "@/models/user";
import createStore from "react-superstore";
import { initTrip } from "@/models/trip";

export const [useUser, setUser, getUser] = createStore(initUser);

export const [useVehicle, setVehicle, getVehicle] = createStore(initVehicle);
export const [useVehicleList, setVehicleList, getVehicleList] = createStore([
  initVehicle,
]);

export const [useTrip, setTrip, getTrip] = createStore(initTrip);

export const [useSidebarExpanded, setSidebarExpanded, getSidebarExpanded] =
  createStore(true);
export const [useSidebarWidth, setSidebarWidth, getSidebarWidth] =
  createStore(275);
