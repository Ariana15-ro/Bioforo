import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MapPin, MessageCircle, UserPlus } from "lucide-react";
import { useEffect, useCallback, useState } from "react";

import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import type { NotificationType } from "@/store/notificationsStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

const META: Record<NotificationType, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: "text-bio-400" },
  comment: { icon: MessageCircle, color: "text-sky-300" },
  nearby: { icon: MapPin, color: "text-amber-300" },
  follow: { icon: UserPlus, color: "text-bio-300" },
};

export function NotificationsPage() {
  const notifications = useNotificationsStore((s) => s.notifications);
  const unread = useNotificationsStore((s) => s.unreadCount);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const loadNotifications = useNotificationsStore((s) => s.load);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const offline = useOfflineStatus();

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  useEffect(() => {
    retry();
  }, [retry]);

  useEffect(() => {
    if (unread > 0) markAllRead();
  }, [unread, markAllRead]);

  return (
    <div className="w-full space-y-4 md:mx-0 md:max-w-none" aria-live="polite">
      <header className="animate-fade-up flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-50">Notificaciones</h1>
        {unread > 0 && (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white animate-pop">
            {unread}
          </span>
        )}
      </header>

      {loading ? (
        <ul className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-white/5 bg-forest-900/60 p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-300">
            {offline ? "Sin conexión – no se pudieron cargar las notificaciones." : "No se pudieron cargar las notificaciones."}
          </p>
          {!offline && (
            <Button variant="primary" onClick={retry} className="mt-3">
              Reintentar
            </Button>
          )}
        </div>
      ) : notifications.length > 0 ? (
        <ul className="space-y-2">
          {notifications.map((n, idx) => {
            const { icon: Icon, color } = META[n.type];
            return (
              <li
                key={n.id}
                style={{ animationDelay: `${Math.min(idx, 20) * 40}ms` }}
                className={`animate-fade-up flex items-start gap-3 rounded-2xl border border-white/5 bg-forest-900/60 p-3 transition hover:border-white/15 ${
                  n.read ? "" : "ring-1 ring-bio-500/40"
                }`}
              >
                <Avatar name={n.userName} size={40} className="ring-2 ring-forest-900" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm text-slate-200">
                    <span className="font-semibold text-slate-50">
                      {n.userName}
                    </span>{" "}
                    {n.text}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
                <Icon size={18} className={`mt-1 shrink-0 ${color}`} />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Heart size={48} className="mb-3 text-bio-500" aria-hidden="true" />
          <p className="text-sm text-slate-300">No tienes notificaciones nuevas</p>
          <p className="mt-1 text-xs text-slate-400">Cuando alguien interactúe con tus avistamientos aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
}
