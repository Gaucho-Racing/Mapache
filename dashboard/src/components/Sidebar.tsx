import { Separator } from "./ui/separator";
import { useNavigate } from "react-router-dom";
import { useVehicle, useUser, setVehicle } from "@/lib/store";
import {
  Car,
  CarFront,
  ChevronDown,
  ChevronsUpDown,
  Gauge,
  LayoutDashboard,
  MapPinned,
  MessageSquareText,
  SearchCode,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useState } from "react";
import { initVehicle, Vehicle } from "@/models/car";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
interface SidebarProps {
  selectedPage?: string;
  className?: string;
  style?: React.CSSProperties;
  isSidebarExpanded: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
}

const Sidebar = (props: SidebarProps) => {
  const navigate = useNavigate();
  const currentVehicle = useVehicle();
  const currentUser = useUser();
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([
    initVehicle,
    {
      id: "gr23-main",
      name: "GR23 Prod",
      description: "Gaucho Racing's 2023 EV Racecar",
      type: "gr23",
      upload_key: "",
      updated_at: new Date(),
      created_at: new Date(),
    },
    {
      id: "gr25-test",
      name: "GR25 Test",
      description: "Gaucho Racing's 2025 EV Racecar",
      type: "gr25",
      upload_key: "",
      updated_at: new Date(),
      created_at: new Date(),
    },
  ]);

  const VehicleClassIcon = (props: {
    vehicleClass: string;
    iconType: string;
  }) => {
    const iconSrc = `/icons/cars/${props.vehicleClass}-${props.iconType}.png`;
    return <img src={iconSrc} className="h-10 w-10 object-contain" />;
  };

  const MapacheHeader = (props: { isSidebarExpanded: boolean }) => {
    return (
      <div className="flex items-center p-4">
        <div className="flex min-w-[60px] items-center justify-center">
          <img src="/logo/mapache.png" className="h-10" />
        </div>
        <div
          style={{
            animation: props.isSidebarExpanded
              ? "slideIn 0.3s ease forwards"
              : "slideOut 0.3s ease forwards",
          }}
          className="whitespace-nowrap pl-4"
        >
          <h2>Mapache</h2>
          <style>
            {`
              @keyframes slideIn {
                from { transform: translateX(2px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(2px); opacity: 0; }
              }
            `}
          </style>
        </div>
      </div>
    );
  };

  const SidebarItem = (props: {
    icon: any;
    text: string;
    link: string;
    isSelected: boolean;
    isSidebarExpanded: boolean;
  }) => {
    return (
      <div
        className={`mx-2 my-2 flex items-center overflow-hidden ${
          props.isSelected
            ? "bg-gradient-to-br from-gr-pink to-gr-purple bg-[length:100%_100%] p-[2px]"
            : ""
        } cursor-pointer rounded-lg transition-all duration-150`}
        onClick={() => navigate(props.link)}
      >
        <div
          className={`flex w-full items-center rounded-lg ${
            props.isSelected ? "bg-card/50" : ""
          } h-10 p-1 hover:bg-neutral-800`}
        >
          <div className="flex min-w-[60px] items-center justify-center">
            <props.icon
              className={`${props.isSelected ? "text-white" : "text-neutral-400"}`}
            />
          </div>
          <div
            style={{
              animation: props.isSidebarExpanded
                ? "slideIn 0.3s ease forwards"
                : "slideOut 0.3s ease forwards",
            }}
            className={`whitespace-nowrap font-semibold ${props.isSelected ? "text-white" : "text-neutral-400"}`}
          >
            <style>
              {`
                @keyframes slideIn {
                  from { transform: translateX(8px); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                  from { transform: translateX(0); opacity: 1; }
                  to { transform: translateX(8px); opacity: 0; }
                }
              `}
            </style>
            {props.text}
          </div>
        </div>
      </div>
    );
  };

  const VehicleSwitcher = (props: {
    isSidebarExpanded: boolean;
    isSelected: boolean;
  }) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={`mx-2 my-2 flex cursor-pointer items-center overflow-hidden rounded-lg bg-gradient-to-br from-gr-pink to-gr-purple bg-[length:100%_100%] p-[2px] transition-all duration-150`}
            onClick={() => {}}
          >
            <div className="flex h-12 w-full items-center rounded-lg bg-card/50 p-1 hover:bg-neutral-800">
              <div className="flex min-w-[60px] items-center justify-center">
                <VehicleClassIcon
                  vehicleClass={currentVehicle.type}
                  iconType={"pixel"}
                />
              </div>
              <div
                style={{
                  animation: props.isSidebarExpanded
                    ? "slideIn 0.3s ease forwards"
                    : "slideOut 0.3s ease forwards",
                }}
                className={`whitespace-nowrap font-semibold text-white`}
              >
                <style>
                  {`
                @keyframes slideIn {
                  from { transform: translateX(8px); opacity: 0; }
                  to { transform: translateX(4px); opacity: 1; }
                }
                @keyframes slideOut {
                  from { transform: translateX(4px); opacity: 1; }
                  to { transform: translateX(8px); opacity: 0; }
                }
              `}
                </style>
                <div className="flex w-full items-center justify-between">
                  <div className="flex w-[160px] flex-col items-start justify-center">
                    <div className="text-sm font-semibold">
                      {currentVehicle.name}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {currentVehicle.id} • {currentVehicle.type}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <ChevronsUpDown />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`mb-2 w-[256px] ${!props.isSidebarExpanded ? "ml-2" : ""}`}
          align="end"
        >
          {vehicleList.map((vehicle) => (
            <DropdownMenuItem
              className={`m-1 ${vehicle.id === currentVehicle.id ? "bg-neutral-800" : ""}`}
              onClick={() => {
                setVehicle(vehicle);
                navigate(`/dashboard?vid=${vehicle.id}`);
              }}
            >
              <div className="flex h-10 w-full items-center gap-4 rounded-lg p-1">
                <VehicleClassIcon
                  vehicleClass={vehicle.type}
                  iconType={"pixel"}
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
  };

  return (
    <nav
      className={`fixed left-0 top-0 z-30 overflow-hidden border-r bg-card transition-all duration-300 ${props.className}`}
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
              <VehicleSwitcher
                isSidebarExpanded={props.isSidebarExpanded}
                isSelected={true}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
