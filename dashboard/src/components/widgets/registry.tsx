import MapWidget from "@/components/widgets/gr24/MapWidget";
import AccelerometerWidget from "@/components/widgets/gr24/AccelerometerWidget";
import {
  Activity,
  BatteryFull,
  Bug,
  CirclePlus,
  Cpu,
  Crosshair,
  Gauge,
  LucideIcon,
  MapIcon,
  TrendingUp,
  Zap,
} from "lucide-react";
import Gr26PedalsWidget from "@/components/widgets/gr26/live/PedalsWidget";
import Gr26PedalBarWidget from "@/components/widgets/gr26/live/PedalBarWidget";
import Gr26EcuDebugWidget from "@/components/widgets/gr26/live/EcuDebugWidget";
import Gr26BcuDebugWidget from "@/components/widgets/gr26/live/BcuDebugWidget";
import Gr26DtiDebugWidget from "@/components/widgets/gr26/live/DtiDebugWidget";
import Gr26InverterDebugWidget from "@/components/widgets/gr26/live/InverterDebugWidget";
import DgpsDebugWidget from "@/components/widgets/gr26/live/DgpsDebugWidget";
import DgpsVelocityWidget from "@/components/widgets/gr26/live/DgpsVelocityWidget";
import DgpsAccelWidget from "@/components/widgets/gr26/live/DgpsAccelWidget";
import DgpsPositionWidget from "@/components/widgets/gr26/live/DgpsPositionWidget";
import BmsCellWidget from "@/components/widgets/gr26/live/AcuCellWidget";
import MobileDebugWidget from "@/components/widgets/gr24/MobileDebugWidget";
import AcuDebugWidget from "@/components/widgets/gr24/AcuDebugWidget";
import PedalsDebugWidget from "@/components/widgets/gr24/PedalsDebugWidget";
import InverterDebugWidget from "@/components/widgets/gr24/InverterDebugWidget";
import VdmDebugWidget from "@/components/widgets/gr24/VdmDebugWidget";
import PedalsWidget from "@/components/widgets/gr24/PedalsWidget";
import AcuCellWidget from "@/components/widgets/gr24/AcuCellWidget";
import TcmResourceOverviewWidget from "@/components/widgets/gr25/live/TcmResourceOverviewWidget";
import TcmCpuWidget from "@/components/widgets/gr25/live/TcmCpuWidget";
import TcmCpuGraphWidget from "@/components/widgets/gr25/live/TcmCpuGraphWidget";
import Gr25EcuDebugWidget from "@/components/widgets/gr25/live/EcuDebugWidget";
import Gr25InverterDebugWidget from "@/components/widgets/gr25/live/InverterDebugWidget";

export interface WidgetEntry {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<any>;
  preview: string;
  icon: LucideIcon;
  span?: number;
}

export const getWidgetRegistry = (vehicle_type: string) => {
  if (vehicle_type === "gr24") {
    return gr24_registry;
  }
  if (vehicle_type === "gr25") {
    return gr25_registry;
  }
  if (vehicle_type === "gr26") {
    return gr26_registry;
  }
  return {};
};

export const gr25_registry = {
  TCM: [
    {
      id: "tcm-resource-overview",
      name: "TCM Resource Overview",
      description: "Shows TCM resource utilization and system status.",
      component: TcmResourceOverviewWidget,
      icon: Activity,
      span: 6,
      preview: "/widgets/gr25/tcm-resource-overview.png",
    },
    {
      id: "tcm-cpu",
      name: "TCM CPU",
      description: "Shows TCM CPU performance metrics.",
      component: TcmCpuWidget,
      icon: Cpu,
      span: 6,
      preview: "/widgets/gr25/tcm-cpu.png",
    },
    {
      id: "tcm-cpu-graph",
      name: "TCM CPU Graph",
      description: "Shows a graphical view of TCM CPU usage over time.",
      component: TcmCpuGraphWidget,
      icon: TrendingUp,
      span: 6,
      preview: "/widgets/gr25/tcm-cpu-graph.png",
    },
  ],
  ECU: [
    {
      id: "ecu-debug",
      name: "ECU Debug",
      description: "Shows all raw data from the ECU node.",
      component: Gr25EcuDebugWidget,
      icon: Bug,
      span: 12,
      preview: "/widgets/gr25/ecu-debug.png",
    },
  ],
  Inverter: [
    {
      id: "inverter-debug",
      name: "Inverter Debug",
      description: "Shows all raw data from the inverter node.",
      component: Gr25InverterDebugWidget,
      icon: Zap,
      span: 12,
      preview: "/widgets/gr25/inverter-debug.png",
    },
  ],
};

export const gr26_registry = {
  Pedal: [
    {
      id: "pedals-full",
      name: "Pedals",
      description:
        "Shows both raw and scaled APPS pedal positions from both position sensors.",
      component: Gr26PedalsWidget,
      icon: Gauge,
      span: 6,
      preview: "/widgets/gr26/pedals-full.png",
    },
    {
      id: "pedal-bar",
      name: "Pedal Bar",
      description:
        "Shows the accelerator pedal position as a 0–100% progress bar.",
      component: Gr26PedalBarWidget,
      icon: Gauge,
      span: 6,
      preview: "/widgets/gr26/pedal-bar.png",
    },
  ],
  ECU: [
    {
      id: "ecu-debug",
      name: "ECU Debug",
      description: "Shows all raw data from the ECU node.",
      component: Gr26EcuDebugWidget,
      icon: Bug,
      span: 12,
      preview: "/widgets/gr26/ecu-debug.png",
    },
  ],
  BCU: [
    {
      id: "bms-cells",
      name: "BMS Cells",
      description:
        "Shows all 280 cell voltages and temperatures across 5 modules (4×14 each) in a U-shaped layout.",
      component: BmsCellWidget,
      icon: BatteryFull,
      span: 12,
      preview: "/widgets/gr26/acu-cells.png",
    },
    {
      id: "bcu-debug",
      name: "BCU Debug",
      description: "Shows all raw data from the BCU node.",
      component: Gr26BcuDebugWidget,
      icon: BatteryFull,
      span: 12,
      preview: "/widgets/gr26/bcu-debug.png",
    },
  ],
  DTI: [
    {
      id: "dti-debug",
      name: "DTI Debug",
      description: "Shows all raw data from the DTI node.",
      component: Gr26DtiDebugWidget,
      icon: Bug,
      span: 12,
      preview: "/widgets/gr26/dti-debug.png",
    },
  ],
  Inverter: [
    {
      id: "inverter-debug",
      name: "Inverter Debug",
      description: "Shows all raw data from the inverter node.",
      component: Gr26InverterDebugWidget,
      icon: Zap,
      span: 12,
      preview: "/widgets/gr26/inverter-debug.png",
    },
  ],
  DGPS: [
    {
      id: "dgps-velocity",
      name: "DGPS Velocity",
      description:
        "Line chart of U, V, W velocity components over the last 10 seconds.",
      component: DgpsVelocityWidget,
      icon: Gauge,
      span: 6,
      preview: "/widgets/gr26/dgps-velocity.png",
    },
    {
      id: "dgps-acceleration",
      name: "DGPS Acceleration",
      description:
        "Visual 2D accelerometer plot for X/Y acceleration with Z readout.",
      component: DgpsAccelWidget,
      icon: Activity,
      span: 4,
      preview: "/widgets/gr26/dgps-acceleration.png",
    },
    {
      id: "dgps-position",
      name: "DGPS Position",
      description: "Mapbox map showing live GPS position with DGPS fix status.",
      component: DgpsPositionWidget,
      icon: Crosshair,
      span: 6,
      preview: "/widgets/gr26/dgps-position.png",
    },
    {
      id: "dgps-debug",
      name: "DGPS Debug",
      description: "Shows all raw data from the DGPS node.",
      component: DgpsDebugWidget,
      icon: Bug,
      span: 12,
      preview: "/widgets/gr26/dgps-debug.png",
    },
  ],
};

export const gr24_registry = {
  ACU: [
    {
      id: "acu-cell",
      name: "ACU Cell",
      description: "Shows all cell voltages and temperatures.",
      component: AcuCellWidget,
      icon: BatteryFull,
      span: 12,
      preview: "/widgets/gr24/acu-cell.png",
    },
    {
      id: "acu-debug",
      name: "ACU Debug",
      description:
        "Shows all raw data from the ACU node. For performance reasons, this widget only shows every 8th cell.",
      component: AcuDebugWidget,
      icon: Bug,
      span: 12,
      preview: "/widgets/gr24/acu-debug.png",
    },
  ],
  Pedal: [
    {
      id: "pedals-full",
      name: "Pedals",
      description:
        "Shows both raw and scaled pedal positions from both position sensors.",
      component: PedalsWidget,
      icon: Bug,
      span: 4,
      preview: "/widgets/gr24/pedals-full.png",
    },
    {
      id: "pedals-debug",
      name: "Pedals Debug",
      description: "Shows all raw data from the pedals node.",
      component: PedalsDebugWidget,
      icon: Bug,
      span: 6,
      preview: "/widgets/gr24/pedals-debug.png",
    },
  ],
  Mobile: [
    {
      id: "map",
      name: "Map",
      description:
        "Shows vehicle's current location and previous path on a map.",
      component: MapWidget,
      icon: MapIcon,
      span: 6,
      preview: "/widgets/gr24/map.png",
    },
    {
      id: "accelerometer",
      name: "Accelerometer",
      description: "Shows vehicle's current X-Y acceleration.",
      component: AccelerometerWidget,
      icon: CirclePlus,
      span: 3,
      preview: "/widgets/gr24/accelerometer.png",
    },
    {
      id: "mobile-debug",
      name: "Mobile Debug",
      description: "Shows all raw data from the mobile node.",
      component: MobileDebugWidget,
      icon: Bug,
      span: 6,
      preview: "/widgets/gr24/mobile-debug.png",
    },
  ],
  Inverter: [
    {
      id: "inverter-debug",
      name: "Inverter Debug",
      description: "Shows all raw data from the inverter node.",
      component: InverterDebugWidget,
      icon: Bug,
      span: 6,
      preview: "/widgets/gr24/inverter-debug.png",
    },
  ],
  VDM: [
    {
      id: "vdm-debug",
      name: "VDM Debug",
      description: "Shows all raw data from the VDM node.",
      component: VdmDebugWidget,
      icon: Bug,
      span: 6,
      preview: "/widgets/gr24/vdm-debug.png",
    },
  ],
};
