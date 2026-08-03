import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, Leaf, MapPin, Search } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { supabase } from "@/lib/supabase";
import {
  fetchSightings,
  fetchUserLikes,
  toggleLike,
  fetchSightingById,
} from "@/lib/supabaseQueries";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import type { Sighting } from "@/types";

const CATEGORIES = [
  "Todas",
  "Flora",
  "Fauna",
  "Aves",
  "Insectos",
  "Ecosistemas",
] as const;

function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

const SightingCard = memo(function SightingCard({
  sighting,
  liked,
  index,
  onOpen,
  onToggleLike,
}: {
  sighting: Sighting;
  liked: boolean;
  index: number;
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
      style={{ animationDelay: `${Math.min(index, 20) * 50}ms` }}
      className="animate-fade-up flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/5 bg-forest-900/60 transition hover:border-bio-500/40 hover:shadow-lg hover:shadow-bio-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bio-500"
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
            className="flex items-center gap-1.5 text-sm text-bio-400 transition hover:text-bio-300 active:scale-95"
          >
            <Heart
              size={18}
              className={liked ? "animate-pop fill-bio-400 text-bio-400" : ""}
            />
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

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

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

      const isCurrentlyLiked = liked[id] || false;
      const newLikedState = !isCurrentlyLiked;

      setLiked((prev) => ({ ...prev, [id]: newLikedState }));
      const store = useSightingsStore.getState();
      store.setSightings(
        store.sightings.map((s) =>
          s.id === id
            ? { ...s, likes: s.likes + (newLikedState ? 1 : -1) }
            : s,
        ),
      );

      try {
        await toggleLike(id, userId);
        const fresh = await fetchSightingById(id);
        if (fresh) {
          useSightingsStore.getState().updateSighting(fresh);
        }
      } catch {
        const currentStore = useSightingsStore.getState();
        setLiked((prev) => ({ ...prev, [id]: isCurrentlyLiked }));
        currentStore.setSightings(
          currentStore.sightings.map((s) =>
            s.id === id
              ? { ...s, likes: s.likes + (isCurrentlyLiked ? 1 : -1) }
              : s,
          ),
        );
        toast.error("No se pudo actualizar el me gusta.");
      }
    },
    [liked, userId, setLiked],
  );

  return (
    <div className="w-full space-y-4">
      <header className="sticky top-0 z-10 -mx-4 flex items-center bg-forest-950/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
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

      <div aria-live="polite" className="w-full">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-forest-900/60"
              >
                <Skeleton className="h-48 w-full rounded-none" />
              </div>
            ))}
          </div>
        ) : sightings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sightings.map((s, idx) => (
              <SightingCard
                key={s.id}
                sighting={s}
                liked={Boolean(liked[s.id])}
                index={idx}
                onOpen={openPost}
                onToggleLike={handleToggleLike}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Leaf size={64} className="mb-4 text-bio-500" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-100">
              Aún no hay avistamientos
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Cambia los filtros o publica tu primer registro de biodiversidad.
            </p>
          </div>
        )}
      </div>

      {!loading && hasMore && (
        <div ref={sentinelRef} className="grid place-items-center py-6">
          {loadingMore && <Skeleton className="h-8 w-8 rounded-full" />}
        </div>
      )}
    </div>
  );
}
