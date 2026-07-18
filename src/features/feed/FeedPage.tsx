import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MapPin, Search } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Logo } from "@/components/common/Logo";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { supabase } from "@/lib/supabase";
import {
  fetchSightings,
  fetchUserLikes,
  toggleLike,
} from "@/lib/supabaseQueries";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import type { Sighting } from "@/types";

/** Horizontal, scrollable category chips ("Todas" first). */
const CATEGORIES = [
  "Todas",
  "Flora",
  "Fauna",
  "Aves",
  "Insectos",
  "Ecosistemas",
] as const;

/** Relative time in Spanish, e.g. "hace 5 horas". */
function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

/** Memoized feed card — only re-renders when its own props change. */
const SightingCard = memo(function SightingCard({
  sighting,
  liked,
  onOpen,
  onToggleLike,
}: {
  sighting: Sighting;
  liked: boolean;
  onOpen: (id: string) => void;
  onToggleLike: (id: string) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(sighting.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(sighting.id);
        }
      }}
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/5 bg-forest-900/60 transition hover:border-bio-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bio-500"
    >
      <SpeciesImage src={sighting.imageUrl} alt={sighting.commonName} className="h-48 w-full" />
      <div className="flex flex-1 flex-col space-y-2 p-4">
        <h2 className="text-lg font-bold text-slate-50">{sighting.commonName}</h2>
        <p className="line-clamp-2 text-sm text-slate-300">{sighting.description}</p>
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={14} className="text-bio-400" />
          {sighting.location}
        </p>
        <p className="text-xs text-slate-400">
          {sighting.author.displayName} · {timeAgo(sighting.createdAt)}
        </p>
        <div className="mt-auto flex items-center gap-5 pt-2 text-slate-300">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(sighting.id);
            }}
            aria-pressed={liked}
            aria-label={liked ? "Quitar me gusta" : "Dar me gusta"}
            className="flex items-center gap-1.5 text-sm text-bio-400 transition hover:text-bio-300"
          >
            <Heart size={18} className={liked ? "fill-bio-400 text-bio-400" : ""} />
            {sighting.likes}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            {sighting.comments} comentarios
          </span>
        </div>
      </div>
    </article>
  );
});

/**
 * Feed / Inicio screen.
 * - Loads sightings from Supabase (server-side search + category filter,
 *   ordered by created_at DESC, with offset pagination / infinite scroll).
 * - Tapping a card opens the global PostDetailModal via the store.
 * Route: /
 */
export function FeedPage() {
  const sightings = useSightingsStore((s) => s.sightings);
  const setSightings = useSightingsStore((s) => s.setSightings);
  const loadMore = useSightingsStore((s) => s.loadMore);
  const hasMore = useSightingsStore((s) => s.hasMore);
  const loadingMore = useSightingsStore((s) => s.loading);
  const openPost = useSightingsStore((s) => s.openPost);

  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const userId = useAuthStore((s) => s.user?.id);

  // Load the current user's like set so hearts reflect real state.
  useEffect(() => {
    if (!userId) return;
    fetchUserLikes(userId)
      .then((set) => {
        const next: Record<string, boolean> = {};
        set.forEach((id) => (next[id] = true));
        setLiked(next);
      })
      .catch(() => {});
  }, [userId]);

  // Initial fetch from Supabase (seeded into the shared store).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSightings({
          category: activeCategory,
          search: searchTerm,
        });
        if (active) setSightings(data);
      } catch (err) {
        if (active) {
          toast.error(err instanceof Error ? err.message : "Error al cargar.");
          setSightings([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeCategory, searchTerm, setSightings]);

  // Debounce the search term (300ms).
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Infinite scroll: load next page when the sentinel is visible.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore({ category: activeCategory, search: searchTerm });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore, activeCategory, searchTerm]);

  // Optional realtime: reflect inserts from other users.
  useEffect(() => {
    const channel = supabase
      .channel("sightings-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sightings" },
        () => {
          fetchSightings({ category: activeCategory, search: searchTerm })
            .then(setSightings)
            .catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCategory, searchTerm, setSightings]);

  const handleToggleLike = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Inicia sesión para dar me gusta.");
        return;
      }
      const isLiked = !liked[id];
      // Optimistic update on the shared store.
      setLiked((prev) => ({ ...prev, [id]: isLiked }));
      setSightings(
        sightings.map((s) =>
          s.id === id ? { ...s, likes: s.likes + (isLiked ? 1 : -1) } : s,
        ),
      );
      try {
        const nowLiked = await toggleLike(id, userId);
        if (nowLiked !== isLiked) {
          // Rollback if the server disagrees.
          setLiked((prev) => ({ ...prev, [id]: nowLiked }));
          setSightings(
            sightings.map((s) =>
              s.id === id ? { ...s, likes: s.likes + (nowLiked ? 1 : -1) } : s,
            ),
          );
        }
      } catch {
        toast.error("No se pudo actualizar el me gusta.");
      }
    },
    [liked, sightings, setSightings, userId],
  );

  return (
    <div className="w-full space-y-4">
      {/* Sticky header: logo + search */}
      <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-forest-950/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Logo />
        <label className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar especies, lugares..."
            aria-label="Buscar especies"
            className="w-full rounded-full border border-white/10 bg-forest-900/70 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-bio-500"
          />
        </label>
      </header>

      {/* Category chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-8 md:px-8">
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
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

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-forest-900/60"
            >
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : sightings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sightings.map((s) => (
            <SightingCard
              key={s.id}
              sighting={s}
              liked={Boolean(liked[s.id])}
              onOpen={openPost}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-slate-400">
          No se encontraron publicaciones.
        </p>
      )}

      {/* Infinite scroll sentinel */}
      {!loading && hasMore && (
        <div ref={sentinelRef} className="grid place-items-center py-6">
          {loadingMore && <Skeleton className="h-8 w-8 rounded-full" />}
        </div>
      )}
    </div>
  );
}
