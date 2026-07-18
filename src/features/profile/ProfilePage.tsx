import { Camera, Compass, Leaf, LogOut, MapPin, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Sighting } from "@/types";

import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { fetchSightings } from "@/lib/supabaseQueries";
import { useAuthStore } from "@/store/authStore";

/** Insignias con color propio. */
const BADGES = [
  { label: "Explorador", icon: Compass, color: "text-sky-300 bg-sky-500/15" },
  { label: "Fotógrafo", icon: Camera, color: "text-amber-300 bg-amber-500/15" },
  { label: "Naturalista", icon: Leaf, color: "text-bio-300 bg-bio-500/15" },
];

const AVATAR_FALLBACK =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80";

/**
 * Profile screen. Shows the logged-in user (real data from Supabase auth),
 * their own sightings gallery, stats, badges and a logout action.
 * Route: /profile
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.currentUser);
  const rawUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const avatarUrl =
    (rawUser?.user_metadata?.avatar_url as string | undefined) ??
    AVATAR_FALLBACK;
  const name = user?.fullName ?? rawUser?.email?.split("@")[0] ?? "Usuario";
  const program =
    user?.academicProgram ?? "Programa académico no especificado";
  const location = "Colombia";
  const email = user?.email ?? rawUser?.email ?? "";

  const [mySightings, setMySightings] = useState<Sighting[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // Load only the current user's sightings from Supabase.
  useEffect(() => {
    if (!rawUser?.id) {
      setMySightings([]);
      setLoadingGallery(false);
      return;
    }
    let active = true;
    setLoadingGallery(true);
    fetchSightings({ userId: rawUser.id })
      .then((data) => active && setMySightings(data))
      .catch(() => active && setMySightings([]))
      .finally(() => active && setLoadingGallery(false));
    return () => {
      active = false;
    };
  }, [rawUser?.id]);

  const stats = [
    { label: "Publicaciones", value: mySightings.length },
    {
      label: "Especies",
      value: new Set(mySightings.map((s) => s.species || s.commonName)).size,
    },
    { label: "Categorías", value: new Set(mySightings.map((s) => s.category)).size },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="w-full space-y-5">
      {/* Header card */}
      <div className="rounded-2xl border border-white/5 bg-forest-900/60 p-5">
        <div className="flex items-center gap-4">
          <Avatar
            name={name}
            src={avatarUrl}
            size={72}
            className="ring-2 ring-bio-500"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-50">{name}</h1>
            <p className="truncate text-sm text-bio-300">{program}</p>
            {email && (
              <p className="truncate text-xs text-slate-400">{email}</p>
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={13} className="text-bio-400" />
              {location}
            </p>
          </div>
        </div>

        <Button variant="ghost" className="mt-4 w-full">
          <Pencil size={16} /> Editar perfil
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/5 bg-forest-900/60 p-4 text-center"
          >
            <p className="text-2xl font-bold text-slate-50">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {BADGES.map(({ label, icon: Icon, color }) => (
          <span
            key={label}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${color}`}
          >
            <Icon size={16} />
            {label}
          </span>
        ))}
      </div>

      {/* Gallery */}
      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-50">
          Mis avistamientos
        </h2>
        {loadingGallery ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        ) : mySightings.length === 0 ? (
          <p className="rounded-2xl border border-white/5 bg-forest-900/40 p-6 text-center text-sm text-slate-400">
            Aún no has publicado avistamientos. ¡Ve a la pestaña Publicar!
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mySightings.map((s) => (
              <SpeciesImage
                key={s.id}
                src={s.imageUrl}
                alt={s.commonName}
                className="aspect-square w-full rounded-xl"
              />
            ))}
          </div>
        )}
      </div>

      <Button variant="ghost" className="w-full" onClick={handleLogout}>
        <LogOut size={16} /> Cerrar sesión
      </Button>
    </div>
  );
}
