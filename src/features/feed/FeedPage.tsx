import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, Leaf, LocateFixed, MapPin, Search, Share, ExternalLink } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { supabase } from "@/lib/supabase";
import {
  fetchSightings,
  fetchUserLikes,
  toggleLike,
  fetchSightingById,
} from "@/lib/supabaseQueries";
import { getUserLocation, haversineKm } from "@/lib/geoUtils";
import { getActiveChallenge } from "@/lib/challengeUtils";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import { useShareSighting } from "@/hooks/useShareSighting";
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
  onNavigateToProfile,
}: {
  sighting: Sighting;
  liked: boolean;
  index: number;
  onOpen: (id: string) => void;
  onToggleLike: (id: string) => void;
  onNavigateToProfile: (userId: string) => void;
}) {
  const authorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigateToProfile(sighting.author.id);
  };

  const { handleShare } = useShareSighting();

  const handleCardShare = useCallback(async () => {
    const result = await handleShare(sighting.id, sighting.commonName, sighting.location);
    if (result.ok) {
      const label =
        result.method === "native"
          ? "Compartido"
          : "Enlace copiado al portapapeles";
      toast.success(label);
    } else {
      toast.error("No se pudo compartir el avistamiento.");
    }
  }, [sighting, handleShare]);

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
      className="animate-fade-up flex cursor-pointer flex-col rounded-2xl border border-white/5 bg-forest-900/60 transition hover:border-bio-500/40 hover:shadow-lg hover:shadow-bio-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bio-500 min-w-0"
    >
      <div className="overflow-hidden rounded-t-2xl bg-forest-800 min-w-0">
        <SpeciesImage fit="contain" src={sighting.imageUrl} alt={sighting.commonName} className="h-auto w-full max-w-full bg-forest-800" />
      </div>
      <div className="flex flex-1 flex-col space-y-2 p-3 sm:p-4">
        <h2 className="break-words text-base sm:text-lg font-bold text-slate-50">{sighting.commonName}</h2>
        <p className="break-words line-clamp-2 text-sm text-slate-300">{sighting.description}</p>
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={14} className="text-bio-400" />
          {sighting.location}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.inaturalist.org/search?q=${encodeURIComponent(sighting.species || sighting.commonName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400 transition hover:border-bio-500/40 hover:text-bio-300"
          >
            <ExternalLink size={10} />
            iNaturalist
          </a>
          <a
            href={`https://www.gbif.org/species/search?q=${encodeURIComponent(sighting.species || sighting.commonName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400 transition hover:border-bio-500/40 hover:text-bio-300"
          >
            <ExternalLink size={10} />
            GBIF
          </a>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={authorClick}
            className="flex min-w-0 items-center gap-2 overflow-hidden rounded-full transition hover:bg-white/5"
          >
            <Avatar name={sighting.author.displayName} src={sighting.author.avatarUrl} size={22} />
            <span className="truncate text-left">
              {sighting.author.displayName} · {timeAgo(sighting.createdAt)}
            </span>
          </button>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2 text-slate-300">
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardShare();
              }}
              aria-label="Compartir avistamiento"
              className="text-slate-400 transition hover:text-bio-400"
            >
              <Share size={18} />
            </button>
          </div>
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            {sighting.comments} comentarios
          </span>
        </div>
      </div>
    </article>
  );
});

export function FeedPage() {
  const navigate = useNavigate();
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
  const [error, setError] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyActive, setNearbyActive] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const userId = useAuthStore((s) => s.user?.id);

  const navigateToProfile = useCallback((authorId: string) => {
    navigate(`/profile/${authorId}`);
  }, [navigate]);

  const handleNearby = useCallback(async () => {
    if (nearbyActive) {
      setNearbyActive(false);
      setUserLoc(null);
      return;
    }
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setNearbyActive(true);
      toast.success("Mostrando avistamientos a 50 km de tu ubicación.");
    } catch {
      toast.error("No se pudo obtener tu ubicación. Activa el GPS o escribe el lugar manualmente.");
    }
  }, [nearbyActive]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchSightings({
        category: activeCategory,
        search: searchTerm,
      });
      setSightings(data);
    } catch (err) {
      setError(true);
      toast.error(err instanceof Error ? err.message : "Error al cargar el feed.");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchTerm, setSightings]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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

  const visible: Sighting[] = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sightings.filter((s) => {
      const hasCoords = Number.isFinite(s.latitude) && Number.isFinite(s.longitude);
      const matchesCategory =
        activeCategory === "Todas" || s.category === activeCategory;
      const matchesSearch =
        term === "" ||
        s.commonName.toLowerCase().includes(term) ||
        (s.species ?? "").toLowerCase().includes(term) ||
        s.location.toLowerCase().includes(term);
      const matchesNearby = nearbyActive
        ? userLoc !== null && hasCoords && haversineKm(userLoc.lat, userLoc.lng, s.latitude!, s.longitude!) <= 50
        : true;
      return hasCoords && matchesCategory && matchesSearch && matchesNearby;
    });
  }, [sightings, searchTerm, activeCategory, nearbyActive, userLoc]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 overflow-x-hidden md:max-w-none md:mx-0">
      <header className="sticky top-0 z-10 flex items-center bg-forest-950/85 py-3 backdrop-blur">
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

      {(() => {
        const challenge = getActiveChallenge();
        if (!challenge) return null;
        return (
          <div className="animate-fade-up rounded-2xl border border-bio-500/30 bg-bio-500/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-bio-300">Reto semanal</p>
                <p className="truncate text-xs text-slate-200">{challenge.description}</p>
              </div>
              <Button variant="primary" onClick={() => navigate("/publish")} className="shrink-0">
                Publicar
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
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
        <button
          type="button"
          onClick={handleNearby}
          className={`flex shrink-0 items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            nearbyActive
              ? "border-bio-500 bg-bio-500 text-white"
              : "border-white/10 text-slate-300 hover:border-white/20"
          }`}
        >
          <LocateFixed size={16} />
          {nearbyActive ? "Cerca de mí" : "Cerca de mí"}
        </button>
      </div>

      <div aria-live="polite" className="w-full">
        {loading ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-forest-900/60 min-w-0"
              >
                <div className="aspect-video w-full">
                <Skeleton className="h-full w-full rounded-none" />
              </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-300">No se pudo cargar el feed.</p>
            <Button variant="primary" onClick={loadFeed} className="mt-3">
              Reintentar
            </Button>
          </div>
        ) : visible.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s, idx) => (
              <SightingCard
                key={s.id}
                sighting={s}
                liked={Boolean(liked[s.id])}
                index={idx}
                onOpen={openPost}
                onToggleLike={handleToggleLike}
                onNavigateToProfile={navigateToProfile}
              />
            ))}
          </div>
        ) : nearbyActive || searchTerm || activeCategory !== "Todas" ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-forest-900/40 p-6 text-center">
            <Leaf size={48} className="mb-3 text-bio-500" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-100">
              Sin resultados
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              No encontramos avistamientos con esos filtros. Prueba cambiando la búsqueda o la categoría.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={() => { setSearchTerm(""); setActiveCategory("Todas"); }}>
                Limpiar filtros
              </Button>
              <Button variant="ghost" onClick={() => navigate("/publish")}>
                Publicar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-forest-900/40 p-6 text-center">
            <Leaf size={48} className="mb-3 text-bio-500" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-100">
              Aún no hay avistamientos
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Cambia los filtros o publica tu primer registro de biodiversidad.
            </p>
            <Button variant="primary" onClick={() => navigate("/publish")} className="mt-3">
              Publicar avistamiento
            </Button>
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
