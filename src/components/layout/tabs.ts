import { Bell, Home, Map, Plus, User, type LucideIcon } from "lucide-react";

/** A single navigation tab definition (shared by BottomNav and Sidebar). */
export interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  center?: boolean;
}

/**
 * Navigation tabs (5 items). The center "Publicar" tab is rendered as a
 * prominent action in both the mobile bottom bar and the desktop sidebar.
 */
export const TABS: Tab[] = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/publish", label: "Publicar", icon: Plus, center: true },
  { to: "/notifications", label: "Notificaciones", icon: Bell },
  { to: "/profile", label: "Perfil", icon: User },
];
