import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/common/Spinner";
import { useAuthStore } from "@/store/authStore";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { FeedPage } from "@/features/feed/FeedPage";

// Code-split heavy/secondary routes to keep the initial bundle small.
const MapPage = lazy(() =>
  import("@/features/map/MapPage").then((m) => ({ default: m.MapPage })),
);
const PublishPage = lazy(() =>
  import("@/features/publish/PublishPage").then((m) => ({ default: m.PublishPage })),
);
const NotificationsPage = lazy(() =>
  import("@/features/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<div className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></div>}>
    {node}
  </Suspense>
);

/**
 * Protected route guard.
 * Redirects unauthenticated users to /login. Uses the real Supabase session
 * exposed through the auth store. Waits for the initial session check to avoid
 * a flash redirect before auth state is resolved.
 */
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    // Auth screens live OUTSIDE the app shell (no bottom navigation).
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    // Everything under "/" is protected and rendered inside AppLayout
    // (which provides the fixed BottomNav + <Outlet /> for the tab pages).
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <FeedPage /> }, // Inicio (ruta por defecto)
          { path: "map", element: withSuspense(<MapPage />) }, // Mapa
          { path: "publish", element: withSuspense(<PublishPage />) }, // Publicar
          { path: "notifications", element: withSuspense(<NotificationsPage />) }, // Notificaciones
          { path: "profile", element: withSuspense(<ProfilePage />) }, // Perfil
        ],
      },
    ],
  },
  // Catch-all: any unknown route falls back to the feed.
  { path: "*", element: <Navigate to="/" replace /> },
]);
