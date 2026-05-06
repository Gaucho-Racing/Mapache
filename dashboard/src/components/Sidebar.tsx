import { Separator } from "./ui/separator";
import { useNavigate } from "react-router-dom";
import { memo, useEffect } from "react";
import {
  useVehicle,
  setVehicle,
  setVehicleList,
  useVehicleList,
} from "@/lib/store";
import {
  Bug,
  CarFront,
  ChevronsUpDown,
  Gauge,
  LayoutDashboard,
  LucideIcon,
  MapPinned,
  MessageSquareText,
  SearchCode,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Vehicle } from "@/models/vehicle";
import { BACKEND_URL } from "@/consts/config";
import axios from "axios";
import { notify } from "@/lib/notify";

interface SidebarProps {
  selectedPage?: string;
  className?: string;
  style?: React.CSSProperties;
  isSidebarExpanded: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
}

// Components are defined at module scope (not inside Sidebar) so their
// references stay stable across Sidebar re-renders. Defining them inside
// Sidebar would make React unmount/remount them on every parent render,
// which resets internal state of children like the Radix dropdown.

function VehicleClassIcon({
  vehicleClass,
  iconType,
}: {
  vehicleClass: string;
  iconType: string;
}) {
  return (
    <img
      src={`/icons/cars/${vehicleClass}-${iconType}.png`}
      className="h-10 w-10 object-contain"
    />
  );
}

function MapacheHeader({ isSidebarExpanded }: { isSidebarExpanded: boolean }) {
  return (
    <div className="flex items-center overflow-hidden p-4">
      <div className="flex min-w-[60px] flex-shrink-0 items-center justify-center">
        <img src="/logo/mapache.png" className="h-10" />
      </div>
      <div
        className={`overflow-hidden whitespace-nowrap pl-4 ${isSidebarExpanded ? "slide-in" : "slide-out"}`}
      >
        <h2>Mapache</h2>
      </div>
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  text,
  link,
  isSelected,
  isSidebarExpanded,
}: {
  icon: LucideIcon;
  text: string;
  link: string;
  isSelected: boolean;
  isSidebarExpanded: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      className={`mx-2 my-2 flex items-center overflow-hidden ${
        isSelected
          ? "bg-gradient-to-br from-gr-pink to-gr-purple bg-[length:100%_100%] p-[2px]"
          : ""
      } cursor-pointer rounded-lg`}
      onClick={(e) => {
        e.stopPropagation();
        navigate(link);
      }}
    >
      <div
        className={`flex w-full items-center overflow-hidden rounded-md ${
          isSelected ? "bg-card/50" : ""
        } h-10 p-1 hover:bg-card`}
      >
        <div className="flex min-w-[60px] flex-shrink-0 items-center justify-center">
          <Icon
            className={isSelected ? "text-white" : "text-neutral-400"}
          />
        </div>
        <div
          className={`overflow-hidden whitespace-nowrap font-semibold ${isSelected ? "text-white" : "text-neutral-400"} ${isSidebarExpanded ? "slide-in" : "slide-out"}`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function VehicleSwitcher({
  isSidebarExpanded,
}: {
  isSidebarExpanded: boolean;
}) {
  const navigate = useNavigate();
  const currentVehicle = useVehicle();
  const vehicleList = useVehicleList();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className="mx-2 my-2 flex cursor-pointer items-center overflow-hidden rounded-lg bg-gradient-to-br from-gr-pink to-gr-purple bg-[length:100%_100%] p-[2px] transition-all duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-12 w-full items-center overflow-hidden rounded-lg bg-card/50 p-1 hover:bg-card">
            <div className="flex min-w-[60px] flex-shrink-0 items-center justify-center">
              <VehicleClassIcon
                vehicleClass={currentVehicle.type}
                iconType="pixel"
              />
            </div>
            <div
              className={`overflow-hidden whitespace-nowrap font-semibold text-white ${isSidebarExpanded ? "slide-in" : "slide-out"}`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex w-[160px] flex-col items-start justify-center overflow-hidden">
                  <div className="w-full truncate text-sm font-semibold">
                    {currentVehicle.name}
                  </div>
                  <div className="w-full truncate text-xs text-neutral-400">
                    {currentVehicle.id} • {currentVehicle.type}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center justify-center">
                  <ChevronsUpDown />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={`mb-2 w-[256px] ${!isSidebarExpanded ? "ml-2" : ""}`}
        align="end"
      >
        {vehicleList.map((vehicle) => (
          <DropdownMenuItem
            key={vehicle.id}
            className={`m-1 ${vehicle.id === currentVehicle.id ? "bg-neutral-800" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setVehicle(vehicle);
              navigate(`/dashboard?vid=${vehicle.id}`);
            }}
          >
            <div className="flex h-10 w-full items-center gap-4 rounded-lg p-1">
              <VehicleClassIcon
                vehicleClass={vehicle.type}
                iconType="pixel"
              />
              <div className="flex flex-col items-start justify-center">
                <div className="text-sm font-semibold">{vehicle.name}</div>
                <div className="text-xs text-neutral-400">
                  {vehicle.id} • {vehicle.type}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const Sidebar = (props: SidebarProps) => {
  const currentVehicle = useVehicle();

  useEffect(() => {
    getVehicles();
  }, []);

  const getVehicles = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/vehicles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
        },
      });
      if (response.status == 200) {
        setVehicleList(
          response.data.data.sort(
            (a: Vehicle, b: Vehicle) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
        return 0;
      }
    } catch (error) {
      notify.error("Failed to fetch vehicles: " + error);
    }
  };

  return (
    <nav
      className={`fixed left-0 top-0 z-30 overflow-hidden border-r transition-all duration-300 ${props.className}`}
      style={{ height: "100vh", width: props.sidebarWidth, ...props.style }}
      onClick={props.toggleSidebar}
    >
      <div className="flex h-full flex-grow flex-col items-start justify-between">
        <div className="w-full">
          <MapacheHeader isSidebarExpanded={props.isSidebarExpanded} />
          <Separator />
          <div className="p-2" />
          <SidebarItem
            icon={LayoutDashboard}
            text="Dashboard"
            link={`/dashboard?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "dashboard"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={Gauge}
            text="Widgets"
            link={`/widgets?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "widgets"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={SearchCode}
            text="Query"
            link={`/query?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "query"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={MessageSquareText}
            text="Chat"
            link={`/chat?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "chat"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={Bug}
            text="Debug"
            link={`/debug?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "debug"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <div className="px-4 py-2">
            <Separator />
          </div>
          <SidebarItem
            icon={MapPinned}
            text="Trips"
            link={`/trips?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "trips"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={CarFront}
            text="Vehicles"
            link={`/vehicles?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "vehicles"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <div className="px-4 py-2">
            <Separator />
          </div>
          <SidebarItem
            icon={Settings}
            text="Settings"
            link={`/settings?vid=${currentVehicle.id}`}
            isSelected={props.selectedPage === "settings"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
        </div>
        <div className="w-full">
          <div className="flex h-full flex-grow flex-col items-start justify-between">
            <div className="w-full pb-2">
              <div className="px-4 py-2">
                <Separator />
              </div>
              <VehicleSwitcher isSidebarExpanded={props.isSidebarExpanded} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default memo(Sidebar);
