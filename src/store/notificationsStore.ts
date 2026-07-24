import { create } from "zustand";

import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/supabaseQueries";
import { useAuthStore } from "./authStore";

export type { NotificationType };

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  addNotification: (n: AppNotification) => void;
  reset: () => void;
  load: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  load: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    set({ loading: true });
    try {
      const items = await fetchNotifications();
      set({
        notifications: items,
        unreadCount: items.filter((n) => !n.read).length,
      });
    } catch {
      // keep previous state on error
    } finally {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    try {
      await markAllNotificationsAsRead(userId);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {
      // ignore
    }
  },

  markRead: async (id) => {
    try {
      await markNotificationAsRead(id);
      set((state) => {
        const target = state.notifications.find((n) => n.id === id);
        if (!target || target.read) return state;
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      });
    } catch {
      // ignore
    }
  },

  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + (n.read ? 0 : 1),
    })),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
    }),
}));
