import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentUser } from "@/consts/config";
import { SHA256 } from "crypto-js";
import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";
import React, { createContext, useState, useContext } from "react";

interface SidebarProps {
  selectedPage: string;
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
      <div className="flex flex-row items-center p-4">
        <img src="logo/mapache.png" className="h-12 pr-4" />
        <h1 className="">Mapache</h1>
      </div>
    );
  };

  const MapacheLogo = () => {
    return (
      <div className="items-center justify-center p-4">
        <img src="logo/mapache.png" className="h-12" />
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
      <div className="flex h-full flex-col items-start justify-between">
        <div>
          {props.isSidebarExpanded ? <MapacheTitle /> : <MapacheLogo />}
        </div>
        <div>user</div>
      </div>
    </nav>
  );
};

export default Sidebar;
