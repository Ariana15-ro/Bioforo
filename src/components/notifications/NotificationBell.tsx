import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import { usePostModal } from "@/components/modals/PostDetailModal";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { AppNotification } from "@/lib/supabaseQueries";

function useNotificationsRealtime(userId: string | undefined) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      retryCountRef.current = 0;
      return;
    }

    let cancelled = false;

    const subscribe = async () => {
      if (cancelled) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(`notifications-${userId}`);
      channelRef.current = channel;

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("subscription timeout")), 8000);

          channel
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
              async (payload) => {
                const row = payload.new as {
                  id: string;
                  user_id: string;
                  actor_id: string | null;
                  type: "like" | "comment" | "nearby" | "follow";
                  sighting_id: string | null;
                  comment_text: string | null;
                  read: boolean;
                  created_at: string;
                };

                let actorName = "Alguien";
                if (row.actor_id) {
                  try {
                    const { data } = await supabase
                      .from("profiles")
                      .select("full_name")
                      .eq("id", row.actor_id)
                      .single();
                    const name = (data?.full_name as string | undefined)?.trim();
                    if (name) actorName = name;
                  } catch {
                    // ignore
                  }
                }

                const text =
                  row.type === "like"
                    ? `le dio me gusta a tu avistamiento`
                    : row.type === "comment"
                      ? `comentó: «${row.comment_text ?? ""}»`
                      : row.type === "nearby"
                        ? `Nuevo avistamiento cerca`
                        : `empezó a seguirte`;

                useNotificationsStore.getState().addNotification({
                  id: row.id,
                  type: row.type,
                  userName: actorName,
                  text,
                  createdAt: row.created_at,
                  read: row.read,
                  sightingId: row.sighting_id ?? undefined,
                });
              },
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                clearTimeout(timeout);
                retryCountRef.current = 0;
                resolve();
              } else if (status === "CHANNEL_ERROR") {
                clearTimeout(timeout);
                reject(new Error("channel_error"));
              } else if (status === "TIMED_OUT") {
                clearTimeout(timeout);
                reject(new Error("timeout"));
              }
            });
        });
      } catch (err) {
        if (cancelled) return;

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          setTimeout(subscribe, delay);
        } else {
          // Silencioso después de agotar reintentos para no spamear consola
          retryCountRef.current = MAX_RETRIES;
        }
      }
    };

    subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);
}

export function NotificationBell() {
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const markRead = useNotificationsStore((s) => s.markRead);
  const loadNotifications = useNotificationsStore((s) => s.load);
  const { openPost } = usePostModal();

  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useNotificationsRealtime(userId);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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
                No tienes notificaciones nuevas.
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
