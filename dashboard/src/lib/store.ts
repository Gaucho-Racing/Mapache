import { initVehicle, Vehicle } from "@/models/vehicle";
import { initUser } from "@/models/user";
import createStore from "react-superstore";

export const [useUser, setUser, getUser] = createStore(initUser);

export const [useVehicle, setVehicle, getVehicle] = createStore(initVehicle);
export const [useVehicleList, setVehicleList, getVehicleList] = createStore<
  Vehicle[]
>([]);

export const [useSidebarExpanded, setSidebarExpanded, getSidebarExpanded] =
  createStore(true);
export const [useSidebarWidth, setSidebarWidth, getSidebarWidth] =
  createStore(275);

export const [useRoseMode, setRoseMode, getRoseMode] = createStore(
  localStorage.getItem("roseMode") === "true",
);

// Persist rose mode to localStorage
export const toggleRoseMode = () => {
  const current = getRoseMode();
  const next = !current;
  setRoseMode(next);
  localStorage.setItem("roseMode", String(next));
};

export interface DashboardPlacement {
  id: string;
  columnStart: number;
}

export const [
  useDashboardPlacements,
  setDashboardPlacements,
  getDashboardPlacements,
] = createStore<DashboardPlacement[]>([]);

export const loadDashboardPlacements = (
  vehicleType: string,
): DashboardPlacement[] => {
  try {
    const saved = localStorage.getItem(`dashboard_placements_${vehicleType}`);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveDashboardPlacements = (
  vehicleType: string,
  placements: DashboardPlacement[],
) => {
  localStorage.setItem(
    `dashboard_placements_${vehicleType}`,
    JSON.stringify(placements),
  );
};
