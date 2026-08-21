import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PostDetailModal } from "@/components/modals/PostDetailModal";
import { NotificationsRealtimeProvider } from "@/components/notifications/NotificationsRealtimeProvider";
import { usePostDeepLink } from "@/hooks/usePostDeepLink";

/**
 * Shell for the authenticated app area.
 * - Mobile: centered phone frame with a fixed bottom navigation.
 * - Desktop (md+): left sidebar + content that fills the remaining width.
 */
export function AppLayout() {
  usePostDeepLink();

  return (
    <NotificationsRealtimeProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar (hidden on mobile) */}
        <Sidebar />

        {/* Screen content (each tab page renders here) */}
        <main className="flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6">
          <div className="mx-auto w-full max-w-6xl">
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
