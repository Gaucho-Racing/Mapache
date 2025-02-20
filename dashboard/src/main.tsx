import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Toaster } from "./components/ui/sonner.tsx";
import RegisterPage from "./pages/auth/RegisterPage.tsx";
import DashboardPage from "./pages/gr24/dashboard/DashboardPage.tsx";
import App from "./App.tsx";

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
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
