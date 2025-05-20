import MapWidget from "@/components/widgets/gr24/MapWidget";
import AccelerometerWidget from "@/components/widgets/gr24/AccelerometerWidget";
import { Bug, CirclePlus, LucideIcon, MapIcon } from "lucide-react";
import MobileDebugWidget from "@/components/widgets/gr24/MobileDebugWidget";
import AcuDebugWidget from "@/components/widgets/gr24/AcuDebugWidget";
import PedalsDebugWidget from "@/components/widgets/gr24/PedalsDebugWidget";
import InverterDebugWidget from "@/components/widgets/gr24/InverterDebugWidget";
import VdmDebugWidget from "@/components/widgets/gr24/VdmDebugWidget";
import PedalsWidget from "./gr24/PedalsWidget";

export interface WidgetEntry {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<any>;
  preview: string;
  icon: LucideIcon;
}

export const getWidgetRegistry = (vehicle_type: string) => {
  if (vehicle_type === "gr24") {
    return gr24_registry;
  }
  return {};
};

export const gr24_registry = {
  ACU: [
    {
      id: "acu-debug",
      name: "ACU Debug",
      description:
        "Shows all raw data from the ACU node. For performance reasons, this widget only shows every 8th cell.",
      component: AcuDebugWidget,
      icon: Bug,
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
      preview: "/widgets/gr24/pedals-full.png",
    },
    {
      id: "pedals-debug",
      name: "Pedals Debug",
      description: "Shows all raw data from the pedals node.",
      component: PedalsDebugWidget,
      icon: Bug,
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
      preview: "/widgets/gr24/map.png",
    },
    {
      id: "accelerometer",
      name: "Accelerometer",
      description: "Shows vehicle's current X-Y acceleration.",
      component: AccelerometerWidget,
      icon: CirclePlus,
      preview: "/widgets/gr24/accelerometer.png",
    },
    {
      id: "mobile-debug",
      name: "Mobile Debug",
      description: "Shows all raw data from the mobile node.",
      component: MobileDebugWidget,
      icon: Bug,
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
      preview: "/widgets/gr24/vdm-debug.png",
    },
  ],
};
