import React, { PropsWithChildren } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { checkCredentials } from "@/lib/auth";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  const [isSidebarExpanded, setSidebarExpanded] = React.useState(true);
  const [sidebarWidth, setSidebarWidth] = React.useState(300);

  React.useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const currentRoute = window.location.pathname + window.location.search;
    const status = await checkCredentials();
    if (status != 0) {
      navigate(`/auth/register?route=${currentRoute}`);
    } else {
      setLoading(false);
    }
  };

  const expandSidebar = () => {
    setSidebarExpanded(true);
    setSidebarWidth(300);
  };

  const collapseSidebar = () => {
    setSidebarExpanded(false);
    setSidebarWidth(100);
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
      <div className="mx-auto h-screen bg-black text-center">
        <div className="flex h-full flex-col items-center justify-center p-32">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        </div>
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
            selectedPage="dashboard"
            isSidebarExpanded={isSidebarExpanded}
            sidebarWidth={sidebarWidth}
            toggleSidebar={toggleSidebar}
          />
          <div className="w-full bg-red-900">
            <Header style={{ left: sidebarWidth }} />
            <div
              className="mt-24 p-4 transition-all duration-200"
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
