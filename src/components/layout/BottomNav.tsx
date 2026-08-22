import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { TABS } from "./tabs";
import { useNotificationsStore } from "@/store/notificationsStore";

/**
 * Mobile bottom navigation (fixed). Five large icons; the center "Publicar"
 * tab is a raised green circle. Hidden on desktop (replaced by the Sidebar).
 * Active items use the brand green.
 */
export function BottomNav() {
  const unread = useNotificationsStore((s) => s.unreadCount);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md items-center justify-around border-t border-white/10 bg-forest-950/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
      {TABS.map(({ to, label, icon: Icon, end, center }) => {
        if (center) {
          return (
            <NavLink
              key={to}
              to={to}
              className="flex -mt-7 flex-col items-center"
              aria-label={label}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-bio-500 text-white shadow-lg shadow-bio-500/40 ring-4 ring-forest-950">
                <Icon size={28} />
              </span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-semibold transition",
                isActive ? "text-bio-400" : "text-slate-400 hover:text-slate-200",
              )
            }
          >
            <span className="relative">
              <Icon size={24} />
              {label === "Notificaciones" && unread > 0 && (
                <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
