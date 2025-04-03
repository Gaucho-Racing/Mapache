import { Separator } from "./ui/separator";
import { useNavigate } from "react-router-dom";
import { useVehicle } from "@/lib/store";
import {
  CarFront,
  Gauge,
  LayoutDashboard,
  MapPinned,
  MessageSquareText,
  SearchCode,
  Settings,
} from "lucide-react";

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

  return (
    <nav
      className={`fixed left-0 top-0 z-30 overflow-hidden border-r bg-card transition-all duration-300 ${props.className}`}
      style={{
        height: "100vh",
        width: props.sidebarWidth,
        ...props.style,
      }}
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
        <div>user</div>
      </div>
    </nav>
  );
};

export default Sidebar;
