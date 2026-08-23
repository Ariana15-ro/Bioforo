import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MapPin, MessageCircle, Pencil, Send, Share, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { TextField } from "@/components/ui/TextField";
import { supabase } from "@/lib/supabase";
import { useShareSighting } from "@/hooks/useShareSighting";
import {
  addComment,
  deleteSighting,
  fetchComments,
  fetchProfile,
  fetchSightingById,
  fetchUserLikes,
  toggleLike,
  updateSighting,
} from "@/lib/supabaseQueries";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import type { Category, Comment } from "@/types";

const CATEGORIES: Category[] = [
  "Flora",
  "Fauna",
  "Aves",
  "Insectos",
  "Ecosistemas",
];

const CommentItem = memo(function CommentItem({ comment }: { comment: Comment }) {
  return (
        <li className="flex items-start gap-2">
          <Avatar name={comment.authorName} size={28} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm text-slate-200">
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
  const storeUpdateSighting = useSightingsStore((s) => s.updateSighting);
  const removeSighting = useSightingsStore((s) => s.removeSighting);
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const { handleShare } = useShareSighting();

  const sighting = sightings.find((s) => s.id === selectedId) ?? null;
  const open = Boolean(selectedId && sighting);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    commonName: "",
    scientificName: "",
    category: "",
    description: "",
    location: "",
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sightingId = sighting?.id ?? null;

  const navigateToProfile = useCallback((authorId: string) => {
    navigate(`/profile/${authorId}`);
  }, [navigate]);

  useEffect(() => {
    if (!sighting) {
      setComments([]);
      setConfirmingDelete(false);
      setAuthorAvatarUrl(undefined);
      setEditing(false);
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
  }, [selectedId, userId]);

  useEffect(() => {
    if (!sightingId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`post-detail-${sightingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes", filter: `sighting_id=eq.${sightingId}` },
        () => {
          fetchSightingById(sightingId).then((fresh) => {
            if (fresh) storeUpdateSighting(fresh);
            if (userId) {
              supabase
                .from("likes")
                .select("sighting_id")
                .eq("sighting_id", sightingId)
                .eq("user_id", userId)
                .maybeSingle()
                .then(({ data: existing }) => {
                  setLiked(Boolean(existing));
                });
            }
          }).catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `sighting_id=eq.${sightingId}` },
        () => {
          fetchComments(sightingId).then(setComments).catch(() => {});
        },
      );

    channelRef.current = channel;

    channel.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sightingId, userId, storeUpdateSighting]);

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
    if (!sightingId || !userId) {
      toast.error("Inicia sesión para dar me gusta.");
      return;
    }
    const prevLiked = liked;
    setLiked(!prevLiked);
    try {
      const result = await toggleLike(sightingId, userId);
      setLiked(result.liked);
      const fresh = await fetchSightingById(sightingId);
      if (fresh) storeUpdateSighting(fresh);
    } catch {
      setLiked(prevLiked);
      toast.error("No se pudo actualizar el me gusta.");
    }
  }, [sightingId, userId, liked, storeUpdateSighting]);

  const handleAddComment = useCallback(
    (text: string) => {
      if (!sightingId || !userId) {
        toast.error("Inicia sesión para comentar.");
        return;
      }
      const optimistic: Comment = {
        id: `temp-${Date.now()}`,
        sightingId: sightingId,
        authorId: userId,
        authorName: "Tú",
        text,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      addComment(sightingId, userId, text)
        .then(async (created) => {
          setComments((prev) =>
            prev.map((c) => (c.id === optimistic.id ? created : c)),
          );
          fetchSightingById(sightingId).then((fresh) => {
            if (fresh) storeUpdateSighting(fresh);
          });
        })
        .catch(() => {
          setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
          toast.error("No se pudo enviar el comentario.");
        });
    },
    [sightingId, userId, storeUpdateSighting],
  );

  const isOwner = Boolean(userId && sighting && sighting.author.id === userId);

  const startEditing = useCallback(() => {
    if (!sighting) return;
    setEditForm({
      commonName: sighting.commonName,
      scientificName: sighting.species,
      category: sighting.category,
      description: sighting.description,
      location: sighting.location,
    });
    setEditing(true);
  }, [sighting]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!sightingId) return;
    setSaving(true);
    try {
      const updated = await updateSighting(sightingId, {
        species_name: editForm.commonName,
        scientific_name: editForm.scientificName,
        category: editForm.category,
        description: editForm.description,
        location: editForm.location,
      });
      if (updated) {
        storeUpdateSighting(updated);
        setEditing(false);
        toast.success("Avistamiento actualizado.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo actualizar el avistamiento.",
      );
    } finally {
      setSaving(false);
    }
  }, [sightingId, editForm, storeUpdateSighting]);

  const handleDelete = useCallback(async () => {
    if (!sightingId) return;
    setDeleting(true);
    try {
      await deleteSighting(sightingId);
      removeSighting(sightingId);
      closePost();
      toast.success("Publicación eliminada.");
    } catch (err) {
      setDeleting(false);
      setConfirmingDelete(false);
      toast.error(
        err instanceof Error ? err.message : "No se pudo eliminar la publicación.",
      );
    }
  }, [sightingId, removeSighting, closePost]);

  if (!open || !sighting) return null;

  return (
    <Modal open={open} onClose={closePost}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-detail-title"
        className="flex max-h-[90vh] flex-col overflow-hidden"
      >
        {editing ? (
          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="post-detail-title" className="text-xl font-bold text-slate-50">
                  Editar avistamiento
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="rounded-full bg-bio-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-bio-400 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>

              <TextField
                label="Nombre de la especie"
                value={editForm.commonName}
                onChange={(e) => setEditForm((f) => ({ ...f, commonName: e.target.value }))}
              />
              <TextField
                label="Nombre científico (opcional)"
                value={editForm.scientificName}
                onChange={(e) => setEditForm((f) => ({ ...f, scientificName: e.target.value }))}
              />
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-200">Categoría</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const active = editForm.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, category: cat }))}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                          active
                            ? "border-bio-500 bg-bio-500 text-white"
                            : "border-white/10 text-slate-300 hover:border-white/20"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block text-sm text-slate-200">
                <span className="mb-1 block font-medium">Descripción</span>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Comportamiento, características, hábitat…"
                  className="w-full rounded-xl border border-white/15 bg-forest-950/60 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-bio-500"
                />
              </label>
              <TextField
                label="Nombre del lugar"
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
          </div>
        ) : (
          <>
            <SpeciesImage
              fit="contain"
              src={sighting.imageUrl}
              alt={sighting.commonName}
              className="w-full max-h-[70vh] h-auto bg-forest-800 shrink-0"
            />
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
              <div className="space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 id="post-detail-title" className="break-words text-xl font-bold text-slate-50">
                      {sighting.commonName}
                    </h2>
                    {isOwner && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={startEditing}
                          aria-label="Editar publicación"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-bio-500/15 hover:text-bio-300"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(true)}
                          aria-label="Eliminar publicación"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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

                <p className="break-words text-sm text-slate-200">{sighting.description}</p>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToProfile(sighting.author.id);
                        }}
                        className="flex min-w-0 items-center gap-2 overflow-hidden rounded-full transition hover:bg-white/5"
                      >
                        <Avatar name={sighting.author.displayName} src={authorAvatarUrl} size={32} />
                        <div className="min-w-0 text-left text-xs">
                          <p className="truncate font-medium text-slate-100">
                            {sighting.author.displayName}
                          </p>
                          <p className="truncate text-slate-400">
                            {formatDistanceToNow(new Date(sighting.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                      </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!sighting || !sightingId) return;
                        handleShare(sighting.id, sighting.commonName, sighting.location).then((result) => {
                          if (result.ok) {
                            const label =
                              result.method === "native"
                                ? "Compartido"
                                : "Enlace copiado al portapapeles";
                            toast.success(label);
                          } else {
                            toast.error("No se pudo compartir el avistamiento.");
                          }
                        });
                      }}
                      aria-label="Compartir avistamiento"
                      className="text-slate-300 transition hover:text-bio-400"
                    >
                      <Share size={18} />
                    </button>
                    <LikeButton liked={liked} count={sighting.likes} onToggle={handleToggleLike} />
                  </div>
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
            </div>
          </>
        )}

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
