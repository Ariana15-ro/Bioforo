import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MapPin, MessageCircle, UserPlus } from "lucide-react";
import { memo } from "react";

import { Avatar } from "@/components/common/Avatar";
import type { AppNotification, NotificationType } from "@/lib/supabaseQueries";

/** Icon + color per notification type. */
const META: Record<NotificationType, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: "text-bio-400" },
  comment: { icon: MessageCircle, color: "text-sky-300" },
  nearby: { icon: MapPin, color: "text-amber-300" },
  follow: { icon: UserPlus, color: "text-bio-300" },
};

/** A single notification row. Memoized to avoid re-renders on list updates. */
export const NotificationItem = memo(function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const { icon: Icon, color } = META[notification.type];
  const clickable = Boolean(notification.sightingId);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        disabled={!clickable}
        aria-label={`${notification.userName} ${notification.text}`}
        className={`flex w-full items-start gap-3 rounded-2xl border border-white/5 p-3 text-left transition ${
          notification.read
            ? "bg-forest-900/40"
            : "bg-forest-900/60 ring-1 ring-bio-500/40"
        } ${clickable ? "hover:bg-forest-800/60" : "cursor-default"}`}
      >
        <Avatar name={notification.userName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-slate-50">
              {notification.userName}
            </span>{" "}
            {notification.text}
          </p>
          {notification.sightingName && (
            <p className="mt-0.5 text-xs text-bio-300">
              {notification.sightingName}
            </p>
          )}
          <p className="mt-0.5 text-xs text-slate-400">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>
        <Icon size={18} className={`mt-1 shrink-0 ${color}`} />
      </button>
    </li>
  );
});
