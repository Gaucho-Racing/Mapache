import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Toaster } from "./components/ui/sonner.tsx";
import PedalPage from "./pages/gr24/pedal/PedalPage.tsx";
import RegisterPage from "./pages/auth/RegisterPage.tsx";
import DashboardPage from "./pages/gr24/dashboard/DashboardPage.tsx";
import NodesPage from "./pages/gr24/nodes/NodesPage.tsx";
import MobilePage from "./pages/gr24/mobile/MobilePage.tsx";
import App from "./App.tsx";
import VDMPage from "./pages/gr24/vdm/VDMPage.tsx";
import WheelPage from "./pages/gr24/wheel/WheelPage.tsx";
import InverterPage from "./pages/gr24/inverter/InverterPage.tsx";
import SteeringWheelPage from "./pages/gr24/steering_wheel/SteeringWheelPage.tsx";
import ACUPage from "./pages/gr24/acu/ACUPage.tsx";
import BCMPage from "./pages/gr24/bcm/BCMPage.tsx";
import DashPanelPage from "./pages/gr24/dash_panel/DashPanelPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/auth/register",
    element: <RegisterPage />,
  },
  {
    path: "/dash",
    element: <DashboardPage />,
  },
  {
    path: "/gr24/dash",
    element: <DashboardPage />,
  },
  {
    path: "/gr24/nodes",
    element: <NodesPage />,
  },
  {
    path: "/gr24/acu",
    element: <ACUPage />,
  },
  {
    path: "/gr24/bcm",
    element: <BCMPage />,
  },
  {
    path: "/gr24/dpanel",
    element: <DashPanelPage />,
  },
  {
    path: "/gr24/inverter",
    element: <InverterPage />,
  },
  {
    path: "/gr24/mobile",
    element: <MobilePage />,
  },
  {
    path: "/gr24/pedal",
    element: <PedalPage />,
  },
  {
    path: "/gr24/steering_wheel",
    element: <SteeringWheelPage />,
  },
  {
    path: "/gr24/vdm",
    element: <VDMPage />,
  },
  {
    path: "/gr24/wheel",
    element: <WheelPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
