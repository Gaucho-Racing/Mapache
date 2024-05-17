import { Separator } from "./ui/separator";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faHospital } from "@fortawesome/free-regular-svg-icons";
import { currentCar } from "@/consts/config";

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

  const MapacheTitle = () => {
    return (
      <div className="flex items-center p-4">
        <img src="/logo/mapache.png" className="h-10 pr-4" />
        <h2>Mapache</h2>
      </div>
    );
  };

  const MapacheLogo = () => {
    return (
      <div className="flex w-full items-center justify-center p-4">
        <img src="/logo/mapache.png" className="h-10" />
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
        className={`mx-2 my-2 flex items-center ${props.isSelected ? "bg-gradient-to-br from-gr-purple to-gr-pink" : ""} cursor-pointer rounded-lg p-1 transition-all duration-150 hover:bg-neutral-800/50`}
        onClick={() => navigate(props.link)}
      >
        <div
          className={`flex ${props.isSidebarExpanded ? "w-1/4" : "w-full"} items-center justify-center`}
        >
          <FontAwesomeIcon
            icon={props.icon}
            className={`transition-all duration-200 ${props.isSelected ? "text-white" : "text-neutral-400"}`}
            size="lg"
          />
        </div>
        <div className={`${props.isSidebarExpanded ? "w-3/4" : "w-0"}`}>
          <p
            className={`bg-clip-text font-semibold tracking-tight text-transparent transition-all duration-200 ${props.isSidebarExpanded ? "block opacity-100" : "hidden opacity-0"} ${props.isSelected ? "bg-white" : "bg-neutral-400"}`}
          >
            {props.text}
          </p>
        </div>
      </div>
    );
  };

  return (
    <nav
      className={`fixed left-0 top-0 z-30 border-r bg-card transition-all duration-200 ${props.className}`}
      style={{
        height: "100vh",
        width: props.sidebarWidth,
        ...props.style,
      }}
      onClick={props.toggleSidebar}
    >
      <div className="flex h-full flex-grow flex-col items-start justify-between">
        <div className="w-full">
          {/* <MapacheTitle /> */}
          {props.isSidebarExpanded ? <MapacheTitle /> : <MapacheLogo />}
          <Separator />
          <div className="p-2" />
          <SidebarItem
            icon={faHospital}
            text="Dashboard"
            link={`/${currentCar.type}/dash`}
            isSelected={props.selectedPage === "dash"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="Nodes"
            link={`/${currentCar.type}/nodes`}
            isSelected={props.selectedPage === "nodes"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="ACU"
            link={`/${currentCar.type}/acu`}
            isSelected={props.selectedPage === "acu"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="BCM"
            link={`/${currentCar.type}/bcm`}
            isSelected={props.selectedPage === "bcm"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="Dash Panel"
            link={`/${currentCar.type}/dpanel`}
            isSelected={props.selectedPage === "dpanel"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="Inverter"
            link={`/${currentCar.type}/inverter`}
            isSelected={props.selectedPage === "inverter"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="Pedals"
            link={`/${currentCar.type}/pedal`}
            isSelected={props.selectedPage === "pedal"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="VDM"
            link={`/${currentCar.type}/vdm`}
            isSelected={props.selectedPage === "vdm"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
          <SidebarItem
            icon={faCircle}
            text="Wheels"
            link={`/${currentCar.type}/wheel`}
            isSelected={props.selectedPage === "wheel"}
            isSidebarExpanded={props.isSidebarExpanded}
          />
        </div>
        <div>user</div>
      </div>
    </nav>
  );
};

export default Sidebar;
