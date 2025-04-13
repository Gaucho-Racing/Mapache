import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Card } from "./ui/card";

interface LayoutProps {
  activeTab?: string;
  headerTitle?: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  activeTab,
  headerTitle,
  children,
}) => {
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);

  const [isSidebarExpanded, setSidebarExpanded] = React.useState(true);
  const [sidebarWidth, setSidebarWidth] = React.useState(275);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [scrollY, setScrollY] = useState(0);

  const handleResize = () => {
    const width = window.innerWidth;

    if (width < 768) {
      collapseSidebar();
    } else {
      expandSidebar();
    }

    setWindowWidth(width);
  };

  const scrollHandler = () => {
    setScrollY(window.scrollY);
  };

  React.useEffect(() => {
    init();
    window.addEventListener("scroll", scrollHandler);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const init = async () => {
    const currentRoute = window.location.pathname + window.location.search;
    const status = await checkCredentials();
    if (status != 0) {
      if (currentRoute == "/") {
        navigate(`/auth/login`);
      } else {
        navigate(`/auth/login?route=${encodeURIComponent(currentRoute)}`);
      }
    } else {
      setLoading(false);
    }
  };

  const expandSidebar = () => {
    if (windowWidth < 768) {
      return;
    }
    setSidebarExpanded(true);
    setSidebarWidth(275);
  };

  const collapseSidebar = () => {
    setSidebarExpanded(false);
    setSidebarWidth(90);
  };

  const toggleSidebar = () => {
    if (isSidebarExpanded) {
      collapseSidebar();
    } else {
      expandSidebar();
    }
  };

  const LoadingComponent = () => {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Card className="border-none p-8" style={{ width: 500 }}>
          <div className="flex flex-col items-center justify-center">
            <img
              src="/logo/mapache.png"
              alt="Mapache"
              className="mx-auto h-14"
            />
            <Loader2 className="mt-8 h-12 w-12 animate-spin" />
          </div>
        </Card>
      </div>
    );
  };

  return (
    <>
      {loading ? (
        <LoadingComponent />
      ) : (
        <div className="flex">
          <Sidebar
            selectedPage={activeTab}
            isSidebarExpanded={isSidebarExpanded}
            sidebarWidth={sidebarWidth}
            toggleSidebar={toggleSidebar}
          />
          <div className="w-full">
            <Header
              scroll={scrollY}
              headerTitle={headerTitle}
              style={{
                left: sidebarWidth,
                width: windowWidth - sidebarWidth,
              }}
            />
            <div
              className="mt-14 p-8 transition-all duration-200"
              style={{ marginLeft: sidebarWidth }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Layout;
