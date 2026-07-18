import { create } from "zustand";

export type NotificationType = "like" | "comment" | "nearby" | "follow";

export interface AppNotification {
  id: string;
  type: NotificationType;
  userName: string;
  text: string;
  createdAt: string; // ISO
  read: boolean;
  /** When present, clicking the notification opens this post. */
  sightingId?: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (n: AppNotification) => void;
  reset: () => void;
}

/** Mock notifications (in-memory). Realtime adds live ones on top. */
const mockNotifications: AppNotification[] = [
  {
    id: "n_1",
    type: "like",
    userName: "Carlos Ramírez",
    text: "le dio me gusta a tu avistamiento de Guacamaya tricolor",
    createdAt: "2026-07-09T13:40:00.000Z",
    read: false,
    sightingId: "s_1",
  },
  {
    id: "n_2",
    type: "comment",
    userName: "Ana Exploradora",
    text: "comentó: «¡Qué colores tan brillantes!»",
    createdAt: "2026-07-09T11:05:00.000Z",
    read: false,
    sightingId: "s_1",
  },
  {
    id: "n_3",
    type: "nearby",
    userName: "BioForo",
    text: "Nuevo avistamiento cerca: Tucán pico iris a 2 km",
    createdAt: "2026-07-09T08:20:00.000Z",
    read: false,
  },
  {
    id: "n_4",
    type: "follow",
    userName: "Luis Méndez",
    text: "empezó a seguirte",
    createdAt: "2026-07-08T19:50:00.000Z",
    read: true,
  },
  {
    id: "n_5",
    type: "like",
    userName: "Sofía Ramírez",
    text: "le dio me gusta a tu avistamiento de Orquídea de mayo",
    createdAt: "2026-07-08T16:10:00.000Z",
    read: true,
    sightingId: "s_2",
  },
];

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter((n) => !n.read).length,
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  markRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.read) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),
  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + (n.read ? 0 : 1),
    })),
  reset: () =>
    set({
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter((n) => !n.read).length,
    }),
}));
