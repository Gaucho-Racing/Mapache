import { Vehicle, initVehicle } from "@/models/car";
import { User, initUser } from "@/models/user";
import AccelerometerLiveWidget from "@/pages/gr24/mobile/widgets/AccelerometerLiveWidget";
import GraphLiveWidget from "@/pages/gr24/mobile/widgets/AltitudeGraphLiveWidget";
import DebugLiveWidget from "@/pages/gr24/mobile/widgets/DebugLiveWidget";
import MapLiveWidget from "@/pages/gr24/mobile/widgets/MapLiveWidget";
import MapSpeedLiveWidget from "@/pages/gr24/mobile/widgets/MapSpeedLiveWidget";
import InverterRawWidget from "@/pages/gr24/inverter/widgets/DebugRawLiveWidget";
import PedalRawWidget from "@/pages/gr24/pedal/widgets/DebugRawLiveWidget";
import MobileRawWidget from "@/pages/gr24/mobile/widgets/DebugRawLiveWidget";
import VDMRawWidget from "@/pages/gr24/vdm/widgets/DebugRawLiveWidget";
import WheelRawWidget from "@/pages/gr24/wheel/widgets/DebugRawLiveWidget";

export const currentUser: User = initUser;
export const currentCar: Vehicle = initVehicle;

export const MAPACHE_API_URL =
  import.meta.env.VITE_MAPACHE_API_URL ?? "http://localhost:10310";

export const MAPACHE_WS_URL =
  import.meta.env.VITE_MAPACHE_WS_URL ?? "ws://localhost:10310";

export const inverterLiveWidgets = [
  {
    name: "Raw Debug Live",
    width: 600,
    height: 300,
    component: <PedalRawWidget />,
  },
];

export const mobileLiveWidgets = [
  {
    name: "Map",
    width: 600,
    height: 300,
    component: <MapLiveWidget />,
  },
  {
    name: "Map w/ Speed",
    width: 600,
    height: 300,
    component: <MapSpeedLiveWidget />,
  },
  {
    name: "Map w/ Speed Large",
    width: 932,
    height: 300,
    component: <MapSpeedLiveWidget />,
  },
  {
    name: "Accelerometer Plot",
    width: 300,
    height: 300,
    component: <AccelerometerLiveWidget />,
  },
  {
    name: "Altitude Graph",
    width: 600,
    height: 300,
    component: <GraphLiveWidget field="altitude" />,
  },
  {
    name: "Heading Graph",
    width: 600,
    height: 300,
    component: <GraphLiveWidget field="heading" />,
  },
  {
    name: "Accelerometer X Graph",
    width: 600,
    height: 300,
    component: <GraphLiveWidget field="accelerometer_x" />,
  },
  {
    name: "Accelerometer Y Graph",
    width: 600,
    height: 300,
    component: <GraphLiveWidget field="accelerometer_y" />,
  },
  {
    name: "Accelerometer Z Graph",
    width: 600,
    height: 300,
    component: <GraphLiveWidget field="accelerometer_z" />,
  },
  {
    name: "Debug Live",
    width: 600,
    height: 300,
    component: <DebugLiveWidget />,
  },
  {
    name: "Raw Debug Live",
    width: 600,
    height: 300,
    component: <MobileRawWidget />,
  },
];

export const pedalLiveWidgets = [
  {
    name: "Raw Debug Live",
    width: 600,
    height: 300,
    component: <PedalRawWidget />,
  },
];

export const vdmLiveWidgets = [
  {
    name: "Raw Debug Live",
    width: 600,
    height: 300,
    component: <VDMRawWidget />,
  },
];

export const wheelLiveWidgets = [
  {
    name: "Raw Debug Live",
    width: 600,
    height: 300,
    component: <WheelRawWidget />,
  },
];
