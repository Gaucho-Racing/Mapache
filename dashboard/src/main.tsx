import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import { Toaster } from "./components/ui/sonner.tsx";
import PedalPage from "./pages/gr24/pedal/PedalPage.tsx";
import RegisterPage from "./pages/auth/RegisterPage.tsx";
import DashboardPage from "./pages/gr24/dashboard/DashboardPage.tsx";
import NodesPage from "./pages/gr24/nodes/NodesPage.tsx";

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
    path: "/gr24/pedal",
    element: <PedalPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
