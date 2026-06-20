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
import SignalsPage from "@/pages/signals/SignalsPage.tsx";

import SettingsPage from "@/pages/settings/SettingsPage.tsx";
import VehiclesPage from "@/pages/vehicles/VehiclesPage.tsx";
import VehicleDetailsPage from "@/pages/vehicles/VehicleDetailsPage.tsx";
import JobsPage from "@/pages/jobs/JobsPage.tsx";
import JobDetailsPage from "@/pages/jobs/JobDetailsPage.tsx";
import DebugPage from "@/pages/debug/DebugPage.tsx";
import SessionsPage from "@/pages/sessions/SessionsPage.tsx";
import SessionDetailPage from "@/pages/sessions/SessionDetailPage.tsx";
import SessionEditorPage from "@/pages/sessions/SessionEditorPage.tsx";
import { useRoseMode } from "@/lib/store";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

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
    path: "/signals",
    element: <SignalsPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
  {
    path: "/vehicles",
    element: <VehiclesPage />,
  },
  {
    path: "/vehicles/:id",
    element: <VehicleDetailsPage />,
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
  {
    path: "/sessions",
    element: <SessionsPage />,
  },
  {
    path: "/sessions/new",
    element: <SessionEditorPage />,
  },
  {
    path: "/sessions/:id",
    element: <SessionDetailPage />,
  },
  {
    path: "/sessions/:id/edit",
    element: <SessionEditorPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* `attribute="class"` matches Tailwind's `darkMode: ["class"]` and
        the no-flash script in index.html — both add/remove the `dark`
        class on <html>. Storage key kept off the next-themes default
        so any future migration can rename without breaking sessions. */}
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="mapache-theme"
    >
      <RoseModeBodyClass />
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </React.StrictMode>,
);

function RoseModeBodyClass() {
  const roseMode = useRoseMode();
  useEffect(() => {
    document.body.classList.toggle("rose-mode", roseMode);
  }, [roseMode]);
  return null;
}
