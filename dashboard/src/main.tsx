import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import "@xyflow/react/dist/style.css";
import { Toaster } from "./components/ui/sonner.tsx";
import App from "./App.tsx";
import LoginPage from "@/pages/auth/LoginPage.tsx";
import QueryPage from "@/pages/query/QueryPage.tsx";

import SettingsPage from "@/pages/settings/SettingsPage.tsx";
import VehiclesPage from "@/pages/vehicles/VehiclesPage.tsx";
import TripsPage from "@/pages/trips/TripsPage.tsx";
import TripDetailsPage from "@/pages/trips/TripDetailsPage.tsx";
import JobsPage from "@/pages/jobs/JobsPage.tsx";
import JobDetailsPage from "@/pages/jobs/JobDetailsPage.tsx";
import DebugPage from "@/pages/debug/DebugPage.tsx";
import { useRoseMode } from "@/lib/store";
import { useEffect } from "react";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/auth/login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <App />,
  },
  {
    path: "/query",
    element: <QueryPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
  {
    path: "/trips",
    element: <TripsPage />,
  },
  {
    path: "/trips/:id",
    element: <TripDetailsPage />,
  },
  {
    path: "/vehicles",
    element: <VehiclesPage />,
  },
  {
    path: "/jobs",
    element: <JobsPage />,
  },
  {
    path: "/jobs/:id",
    element: <JobDetailsPage />,
  },
  {
    path: "/debug",
    element: <DebugPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RoseModeBodyClass />
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);

function RoseModeBodyClass() {
  const roseMode = useRoseMode();
  useEffect(() => {
    document.body.classList.toggle("rose-mode", roseMode);
  }, [roseMode]);
  return null;
}
