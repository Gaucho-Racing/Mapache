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
import WidgetsPage from "@/pages/widgets/WidgetsPage.tsx";
import ChatPage from "@/pages/chat/ChatPage.tsx";
import VehiclesPage from "@/pages/vehicles/VehiclesPage.tsx";
import TripsPage from "@/pages/trips/TripsPage.tsx";
import TripDetailsPage from "@/pages/trips/TripDetailsPage.tsx";
import Test from "@/pages/test/Test.tsx";

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
    path: "/widgets",
    element: <WidgetsPage />,
  },
  {
    path: "/query",
    element: <QueryPage />,
  },
  {
    path: "/chat",
    element: <ChatPage />,
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
    path: "/test",
    element: <Test />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
