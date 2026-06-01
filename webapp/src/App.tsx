import { lazy } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy-loaded route components — each becomes its own chunk.
const Overview = lazy(() => import("@/pages/Overview"));
const MapView = lazy(() => import("@/pages/MapView"));
const Region = lazy(() => import("@/pages/Region"));
const Transitions = lazy(() => import("@/pages/Transitions"));
const Ranking = lazy(() => import("@/pages/Ranking"));
const About = lazy(() => import("@/pages/About"));

// Hash routing keeps deep links working on GitHub Pages without a server.
const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <Overview /> },
      { path: "map", element: <MapView /> },
      { path: "region/:id", element: <Region /> },
      { path: "transitions", element: <Transitions /> },
      { path: "ranking", element: <Ranking /> },
      { path: "about", element: <About /> },
      { path: "*", element: <Navigate to="/overview" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
