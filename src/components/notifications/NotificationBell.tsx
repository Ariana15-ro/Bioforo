import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import {
  useNotificationsStore,
  type AppNotification,
} from "@/store/notificationsStore";
import { usePostModal } from "@/components/modals/PostDetailModal";
import { NotificationItem } from "@/components/notifications/NotificationItem";

/**
 * Global notification bell with unread badge.
 * - Desktop: dropdown panel. Mobile: bottom-sheet.
 * - Click an item linked to a post -> opens PostDetailModal.
 * - Subscribes to Supabase Realtime (likes/comments) and creates live
 *   notifications when the current user owns the affected sighting.
 */
export function NotificationBell() {
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const markRead = useNotificationsStore((s) => s.markRead);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const { openPost } = usePostModal();

  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Realtime: notify the owner when someone likes/comments on their post.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes" },
        async (payload) => {
          const row = payload.new as { sighting_id: string; user_id: string };
          const { data: sighting } = await supabase
            .from("sightings")
            .select("user_id, species_name")
            .eq("id", row.sighting_id)
            .single();
          if (!sighting || sighting.user_id !== userId) return;
          if (row.user_id === userId) return; // ignore self
          const actor = await fetchActorName(row.user_id);
          addNotification({
            id: `live-like-${row.sighting_id}-${Date.now()}`,
            type: "like",
            userName: actor,
            text: `le dio me gusta a tu avistamiento de ${sighting.species_name}`,
            createdAt: new Date().toISOString(),
            read: false,
            sightingId: row.sighting_id,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        async (payload) => {
          const row = payload.new as { sighting_id: string; user_id: string; comment: string };
          const { data: sighting } = await supabase
            .from("sightings")
            .select("user_id, species_name")
            .eq("id", row.sighting_id)
            .single();
          if (!sighting || sighting.user_id !== userId) return;
          if (row.user_id === userId) return;
          const actor = await fetchActorName(row.user_id);
          addNotification({
            id: `live-comment-${row.sighting_id}-${Date.now()}`,
            type: "comment",
            userName: actor,
            text: `comentó en tu avistamiento de ${sighting.species_name}: «${row.comment}»`,
            createdAt: new Date().toISOString(),
            read: false,
            sightingId: row.sighting_id,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);

  const handleOpen = (n: AppNotification) => {
    if (n.sightingId) {
      markRead(n.id);
      setOpen(false);
      openPost(n.sightingId);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative grid h-10 w-10 place-items-center rounded-full text-slate-200 transition hover:bg-white/10 hover:text-slate-50"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile: bottom-sheet */}
          <div
            className="fixed inset-0 z-[1900] bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Notificaciones"
            className="fixed inset-x-0 bottom-0 z-[2000] max-h-[80vh] overflow-y-auto rounded-t-3xl bg-forest-900 p-4 shadow-2xl md:inset-auto md:absolute md:right-0 md:top-12 md:w-80 md:rounded-2xl md:border md:border-white/10"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-50">Notificaciones</h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-bio-400 transition hover:text-bio-300"
                >
                  Marcar todas leídas
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No tienes notificaciones.
              </p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={handleOpen} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Best-effort actor display name from auth users (falls back to "Alguien"). */
async function fetchActorName(actorId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", actorId)
      .single();
    const name = (data?.full_name as string | undefined)?.trim();
    if (name) return name;
  } catch {
    /* ignore */
  }
  return "Alguien";
}
