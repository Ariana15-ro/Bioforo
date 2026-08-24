import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PostDetailModal } from "@/components/modals/PostDetailModal";
import { NotificationsRealtimeProvider } from "@/components/notifications/NotificationsRealtimeProvider";
import { usePostDeepLink } from "@/hooks/usePostDeepLink";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

/**
 * Shell for the authenticated app area.
 * - Mobile: centered phone frame with a fixed bottom navigation.
 * - Desktop (md+): left sidebar + content that fills the remaining width.
 */
export function AppLayout() {
  usePostDeepLink();
  const offline = useOfflineStatus();

  return (
    <NotificationsRealtimeProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        {/* Offline banner */}
        {offline && (
          <div className="fixed inset-x-0 top-0 z-[2000] border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300">
            Sin conexión – mostrando datos guardados
          </div>
        )}

        {/* Desktop sidebar (hidden on mobile) */}
        <Sidebar />

        {/* Screen content (each tab page renders here) */}
        <main className={`flex-1 min-w-0 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6 ${offline ? "pt-10" : ""}`}>
          <div className="mx-auto w-full min-w-0 md:max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar (hidden on desktop) */}
        <BottomNav />

        {/* Global notification bell (top-right, all authenticated screens) */}
        <div className="fixed right-3 top-3 z-[1800] md:right-5 md:top-4">
          <NotificationBell />
        </div>

        {/* Global post detail modal (mounted once, driven by the store) */}
        <PostDetailModal />

        {/* Global toasts (success, error, etc.) */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#1f2c23",
              color: "#e2e8f0",
              border: "1px solid rgba(34,197,94,0.4)",
              fontSize: "0.875rem",
            },
            success: { iconTheme: { primary: "#22c55e", secondary: "#1f2c23" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#1f2c23" } },
          }}
        />
      </div>
    </NotificationsRealtimeProvider>
  );
}
