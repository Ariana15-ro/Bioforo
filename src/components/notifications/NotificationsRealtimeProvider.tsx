import { useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";

export function NotificationsRealtimeProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id);
  const addNotification = useNotificationsStore((s) => s.addNotification);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`notifications-realtime-${userId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
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

        addNotification({
          id: row.id,
          type: row.type,
          userName: actorName,
          text,
          createdAt: row.created_at,
          read: row.read,
          sightingId: row.sighting_id ?? undefined,
        });
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);

  return <>{children}</>;
}
