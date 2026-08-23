import { useEffect, useCallback, useState } from "react";
import { useParams } from "react-router-dom";

import { Camera, Compass, Leaf, MapPin } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { fetchProfile } from "@/lib/supabaseQueries";
import { fetchSightingsByUser } from "@/lib/profileQueries";
import { computeBadges } from "@/lib/badgeUtils";
import { getActiveChallenge, isChallengeCompleted } from "@/lib/challengeUtils";
import { usePostModal } from "@/components/modals/PostDetailModal";
import type { Profile, Sighting } from "@/types";

const BADGE_ICONS: Record<string, typeof Compass> = {
  compass: Compass,
  camera: Camera,
  leaf: Leaf,
};

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { openPost } = usePostModal();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    try {
      const [p, data] = await Promise.all([
        fetchProfile(userId),
        fetchSightingsByUser(userId),
      ]);
      setProfile(p ?? null);
      setSightings(data);
      if (!p) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-slate-300">No se pudo cargar el perfil.</p>
        <Button variant="primary" onClick={load} className="mt-3">
          Reintentar
        </Button>
      </div>
    );
  }

  const categories = Array.from(new Set(sightings.map((s) => s.category).filter(Boolean))) as string[];
  const displayName = profile.fullName || "Usuario";
  const badges = computeBadges(sightings);

  return (
    <div className="w-full space-y-5">
      <div className="animate-fade-up rounded-2xl border border-white/5 bg-forest-900/60 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} src={profile.avatarUrl} size={72} className="ring-2 ring-bio-500" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-50">{displayName}</h1>
            <p className="truncate text-sm text-bio-300">{profile.academicProgram || "Programa académico no especificado"}</p>
            {profile.email && <p className="truncate text-xs text-slate-400">{profile.email}</p>}
            {profile.location && (
              <p className="mt-1 flex items-center gap-1 break-words text-xs text-slate-400">
                <MapPin size={13} className="text-bio-400" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 break-words text-sm text-slate-300">{profile.bio}</p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/5 bg-forest-900/40 p-3 text-center">
            <p className="text-xl font-bold text-slate-50">{sightings.length}</p>
            <p className="text-xs text-slate-400">Publicaciones</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-forest-900/40 p-3 text-center">
            <p className="text-xl font-bold text-slate-50">{categories.length}</p>
            <p className="text-xs text-slate-400">Categor�as</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-forest-900/40 p-3 text-center">
            <p className="text-xl font-bold text-slate-50">
              {new Set(sightings.map((s) => s.species || s.commonName)).size}
            </p>
            <p className="text-xs text-slate-400">Especies</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {badges.length > 0 ? (
            badges.map(({ label, icon, color }) => {
              const Icon = BADGE_ICONS[icon];
              return (
                <span
                  key={label}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${color}`}
                >
                  <Icon size={16} />
                  {label}
                </span>
              );
            })
          ) : (
            <p className="text-xs text-slate-400">Sigue publicando para desbloquear insignias.</p>
          )}
          {(() => {
            const challenge = getActiveChallenge();
            if (!challenge) return null;
            const completed = isChallengeCompleted(sightings, challenge);
            if (!completed) return null;
            return (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300">
                Reto semanal
              </span>
            );
          })()}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-50">Avistamientos</h2>
        {sightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-forest-900/40 p-6 text-center">
            <p className="text-sm text-slate-300">A�n no hay avistamientos publicados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sightings.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openPost(s.id)}
                className="rounded-xl"
              >
                <SpeciesImage src={s.imageUrl} alt={s.commonName} className="aspect-square w-full rounded-xl" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

