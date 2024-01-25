import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Toaster } from "./components/ui/toaster.tsx";
import PedalDetailsPage from "./pages/pedal/PedalDetailsPage.tsx";
import RegisterPage from "./pages/auth/RegisterPage.tsx";

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
    path: "/pedal",
    element: <PedalDetailsPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />

    <Toaster />
  </React.StrictMode>,
);
