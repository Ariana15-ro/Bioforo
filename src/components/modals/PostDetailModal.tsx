import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MapPin, MessageCircle, Send, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import {
  addComment,
  deleteSighting,
  fetchComments,
  fetchUserLikes,
  toggleLike,
  fetchSightingById,
  fetchProfile,
} from "@/lib/supabaseQueries";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import type { Comment } from "@/types";

const CommentItem = memo(function CommentItem({ comment }: { comment: Comment }) {
  return (
    <li className="flex items-start gap-2">
      <Avatar name={comment.authorName} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200">
          <span className="font-semibold text-slate-50">{comment.authorName}</span>{" "}
          {comment.text}
        </p>
        <p className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(comment.createdAt), {
            addSuffix: true,
            locale: es,
          })}
        </p>
      </div>
    </li>
  );
});

const CommentInput = memo(function CommentInput({
  onSend,
}: {
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setValue("");
    onSend(text);
  };

  return (
    <form className="mt-3 flex items-center gap-2" onSubmit={submit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escribe un comentario..."
        aria-label="Escribir comentario"
        className="w-full rounded-full border border-white/15 bg-forest-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-bio-500"
      />
      <button
        type="submit"
        aria-label="Enviar comentario"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bio-500 text-forest-950 transition hover:bg-bio-400"
      >
        <Send size={16} />
      </button>
    </form>
  );
});

const LikeButton = memo(function LikeButton({
  liked,
  count,
  onToggle,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-bio-400"
      aria-pressed={liked}
      aria-label={liked ? "Quitar me gusta" : "Dar me gusta"}
    >
      <Heart
        size={18}
        className={liked ? "fill-bio-400 text-bio-400" : "text-bio-400"}
      />
      {count}
    </button>
  );
});

function PostDetailModalBase() {
  const selectedId = useSightingsStore((s) => s.selectedId);
  const closePost = useSightingsStore((s) => s.closePost);
  const sightings = useSightingsStore((s) => s.sightings);
  const removeSighting = useSightingsStore((s) => s.removeSighting);
  const userId = useAuthStore((s) => s.user?.id);

  const sighting = sightings.find((s) => s.id === selectedId) ?? null;
  const open = Boolean(selectedId && sighting);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sighting) {
      setComments([]);
      setConfirmingDelete(false);
      setAuthorAvatarUrl(undefined);
      return;
    }
    let active = true;
    setCommentsLoading(true);
    fetchComments(sighting.id)
      .then((c) => active && setComments(c))
      .catch(() => active && setComments([]))
      .finally(() => active && setCommentsLoading(false));

    if (userId) {
      fetchUserLikes(userId)
        .then((set) => active && setLiked(set.has(sighting.id)))
        .catch(() => {});
    } else {
      setLiked(false);
    }

    if (sighting.author.id && sighting.author.id !== "anon") {
      fetchProfile(sighting.author.id)
        .then((p) => active && setAuthorAvatarUrl(p?.avatarUrl))
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [sighting, userId]);

  useEffect(() => {
    if (!sighting) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`post-detail-${sighting.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "likes", filter: `sighting_id=eq.${sighting.id}` },
          async () => {
            const fresh = await fetchSightingById(sighting.id);
            if (fresh) useSightingsStore.getState().updateSighting(fresh);
            if (userId) {
              const { data: existing } = await supabase
                .from("likes")
                .select("sighting_id")
                .eq("sighting_id", sighting.id)
                .eq("user_id", userId)
                .maybeSingle();
              setLiked(Boolean(existing));
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "comments", filter: `sighting_id=eq.${sighting.id}` },
          async () => {
            const fresh = await fetchSightingById(sighting.id);
            if (fresh) useSightingsStore.getState().updateSighting(fresh);
            fetchComments(sighting.id).then(setComments).catch(() => {});
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.info(`[realtime] post-detail ready for ${sighting.id}`);
          } else if (status === "CHANNEL_ERROR") {
            console.warn(`[realtime] post-detail blocked for ${sighting.id}`);
          } else if (status === "TIMED_OUT") {
            console.warn(`[realtime] post-detail timeout for ${sighting.id}`);
          }
        });
    } catch (err) {
      console.warn(`[realtime] post-detail subscription failed for ${sighting.id}`, err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sighting, userId]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(
      () => panel?.querySelector<HTMLButtonElement>("button[aria-label='Cerrar']")?.focus(),
      0,
    );
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  const handleToggleLike = useCallback(async () => {
    if (!sighting || !userId) {
      toast.error("Inicia sesión para dar me gusta.");
      return;
    }
    const prevLiked = liked;
    setLiked(!prevLiked);
    try {
      const result = await toggleLike(sighting.id, userId);
      if (result.liked !== prevLiked) {
        setLiked(result.liked);
      }
      const fresh = await fetchSightingById(sighting.id);
      if (fresh) {
        useSightingsStore.getState().updateSighting(fresh);
      }
    } catch {
      setLiked(prevLiked);
      toast.error("No se pudo actualizar el me gusta.");
    }
  }, [sighting, userId, liked]);

  const handleAddComment = useCallback(
    (text: string) => {
      if (!sighting || !userId) {
        toast.error("Inicia sesión para comentar.");
        return;
      }
      const optimistic: Comment = {
        id: `temp-${Date.now()}`,
        sightingId: sighting.id,
        authorId: userId,
        authorName: "Tú",
        text,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      addComment(sighting.id, userId, text)
        .then(async (created) => {
          setComments((prev) =>
            prev.map((c) => (c.id === optimistic.id ? created : c)),
          );
          const fresh = await fetchSightingById(sighting.id);
          if (fresh) {
            useSightingsStore.getState().updateSighting(fresh);
          }
        })
        .catch(() => {
          setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
          toast.error("No se pudo enviar el comentario.");
        });
    },
    [sighting, userId],
  );

  const isOwner = Boolean(userId && sighting && sighting.author.id === userId);

  const handleDelete = useCallback(async () => {
    if (!sighting) return;
    setDeleting(true);
    try {
      await deleteSighting(sighting.id);
      removeSighting(sighting.id);
      closePost();
      toast.success("Publicación eliminada.");
    } catch (err) {
      setDeleting(false);
      setConfirmingDelete(false);
      toast.error(
        err instanceof Error ? err.message : "No se pudo eliminar la publicación.",
      );
    }
  }, [sighting, removeSighting, closePost]);

  if (!open || !sighting) return null;

  return (
    <Modal open={open} onClose={closePost}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="post-detail-title">
        <SpeciesImage
          src={sighting.imageUrl}
          alt={sighting.commonName}
          className="h-64 w-full"
        />
        <div className="space-y-3 p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 id="post-detail-title" className="text-xl font-bold text-slate-50">
                {sighting.commonName}
              </h2>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Eliminar publicación"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-red-500/15 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            {sighting.species && (
              <p className="text-xs italic text-slate-400">{sighting.species}</p>
            )}
            <span className="mt-1 inline-block rounded-full bg-bio-500/15 px-2.5 py-0.5 text-xs font-medium text-bio-300">
              {sighting.category}
            </span>
          </div>

          <p className="flex items-center gap-1 text-sm text-slate-300">
            <MapPin size={15} className="text-bio-400" />
            {sighting.location}
          </p>

          <p className="text-sm text-slate-200">{sighting.description}</p>

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <Avatar name={sighting.author.displayName} src={authorAvatarUrl} size={32} />
              <div className="text-xs">
                <p className="font-medium text-slate-100">
                  {sighting.author.displayName}
                </p>
                <p className="text-slate-400">
                  {formatDistanceToNow(new Date(sighting.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>
            <LikeButton liked={liked} count={sighting.likes} onToggle={handleToggleLike} />
          </div>

          <div className="border-t border-white/5 pt-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
              <MessageCircle size={16} /> Comentarios
            </h3>
            {commentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400">Sé el primero en comentar.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <CommentItem key={c.id} comment={c} />
                ))}
              </ul>
            )}
            <CommentInput onSend={handleAddComment} />
          </div>
        </div>

        <Modal open={confirmingDelete} onClose={() => setConfirmingDelete(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="space-y-4 p-5"
          >
            <h2 id="delete-title" className="text-lg font-bold text-slate-50">
              ¿Eliminar publicación?
            </h2>
            <p className="text-sm text-slate-300">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Modal>
  );
}

export const PostDetailModal = memo(PostDetailModalBase);

export function usePostModal() {
  const openPost = useSightingsStore((s) => s.openPost);
  const closePost = useSightingsStore((s) => s.closePost);
  return { openPost, closePost };
}
