import { NavLink } from "react-router-dom";

import { Logo } from "../common/Logo";
import { cn } from "../../lib/utils";
import { TABS } from "./tabs";
import { useNotificationsStore } from "@/store/notificationsStore";

/**
 * Desktop navigation sidebar (left). Vertical list of the 5 tabs with the
 * "Publicar" action as a prominent green button. Shown only on lg+ screens;
 * on mobile the BottomNav is used instead.
 */
export function Sidebar() {
  const unread = useNotificationsStore((s) => s.unreadCount);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-forest-950/60 p-4 md:flex">
      <Logo className="mb-8 px-2" />

      <nav className="flex flex-col gap-1">
        {TABS.map(({ to, label, icon: Icon, end, center }) =>
          center ? (
            <NavLink key={to} to={to} className="mt-2">
              <span className="flex items-center justify-center gap-2 rounded-full bg-bio-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-bio-500/30">
                <Icon size={20} />
                {label}
              </span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-bio-500/10 text-bio-400"
                    : "text-slate-300 hover:bg-white/5 hover:text-slate-100",
                )
              }
            >
              <Icon size={22} />
              <span className="flex-1">{label}</span>
              {label === "Notificaciones" && unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ),
        )}
      </nav>
    </aside>
  );
}
