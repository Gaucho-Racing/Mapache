import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import {
  useSidebarExpanded,
  setSidebarExpanded,
  useSidebarWidth,
  setSidebarWidth,
} from "@/lib/store";

interface LayoutProps {
  activeTab?: string;
  headerTitle?: string;
  children: React.ReactNode;
}

const SIDEBAR_WIDTH_EXPANDED = 275;
const SIDEBAR_WIDTH_COLLAPSED = 90;
const MOBILE_BREAKPOINT = 768;

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Card className="border-none p-8" style={{ width: 500 }}>
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo/mapache.png"
            alt="Mapache"
            className="mx-auto h-14 animate-scale"
          />
          <Loader2 className="mt-8 h-12 w-12 animate-spin text-primary" />
        </div>
      </Card>
    </div>
  );
}

const Layout: React.FC<LayoutProps> = ({
  activeTab,
  headerTitle,
  children,
}) => {
  const navigate = useNavigate();
  const isSidebarExpanded = useSidebarExpanded();
  const sidebarWidth = useSidebarWidth();

  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const init = async () => {
      const currentRoute = window.location.pathname + window.location.search;
      const status = await checkCredentials();
      if (status !== 0) {
        if (currentRoute === "/") {
          navigate(`/auth/login`);
        } else {
          navigate(`/auth/login?route=${encodeURIComponent(currentRoute)}`);
        }
      } else {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setSidebarExpanded(false);
        setSidebarWidth(SIDEBAR_WIDTH_COLLAPSED);
      } else {
        setSidebarExpanded(true);
        setSidebarWidth(SIDEBAR_WIDTH_EXPANDED);
      }
      setWindowWidth(width);
    };
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Stable callback reference so that React.memo on Sidebar can short-circuit
  // when nothing else changed. Without useCallback, every parent render
  // creates a new function, busts memo, and rerenders the entire sidebar
  // tree (and tears down anything stateful inside, like Radix dropdowns).
  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setSidebarExpanded(false);
      setSidebarWidth(SIDEBAR_WIDTH_COLLAPSED);
      return;
    }
    if (isSidebarExpanded) {
      setSidebarExpanded(false);
      setSidebarWidth(SIDEBAR_WIDTH_COLLAPSED);
    } else {
      setSidebarExpanded(true);
      setSidebarWidth(SIDEBAR_WIDTH_EXPANDED);
    }
  }, [isSidebarExpanded]);

  const headerStyle = useMemo(
    () => ({
      left: sidebarWidth,
      width: windowWidth - sidebarWidth,
    }),
    [sidebarWidth, windowWidth],
  );

  const contentStyle = useMemo(
    () => ({ marginLeft: sidebarWidth }),
    [sidebarWidth],
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex">
      <Sidebar
        isSidebarExpanded={isSidebarExpanded}
        selectedPage={activeTab}
        sidebarWidth={sidebarWidth}
        toggleSidebar={toggleSidebar}
      />
      <div className="w-full">
        <Header
          scroll={scrollY}
          headerTitle={headerTitle}
          style={headerStyle}
        />
        <div
          className="mt-14 overflow-auto p-8 transition-all duration-200"
          style={contentStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
