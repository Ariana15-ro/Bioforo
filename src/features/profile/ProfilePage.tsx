import { Camera, Compass, Leaf, LogOut, MapPin, Pencil, Trash2 } from "lucide-react";
import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { SpeciesImage } from "@/components/common/SpeciesImage";
import { TextField } from "@/components/ui/TextField";
import { fetchProfile, updateProfile } from "@/lib/supabaseQueries";
import { fetchSightingsByUser } from "@/lib/profileQueries";
import { computeBadges } from "@/lib/badgeUtils";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import type { Profile, Sighting } from "@/types";
import toast from "react-hot-toast";

const BADGE_ICONS: Record<string, typeof Compass> = {
  compass: Compass,
  camera: Camera,
  leaf: Leaf,
};

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.currentUser);
  const rawUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [mySightings, setMySightings] = useState<Sighting[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [galleryError, setGalleryError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatarUrl = profile?.avatarUrl ?? avatarPreview ?? user?.avatarUrl;
  const name = profile?.fullName ?? user?.fullName ?? rawUser?.email?.split("@")[0] ?? "Usuario";
  const program = profile?.academicProgram ?? user?.academicProgram ?? "Programa académico no especificado";
  const location = profile?.location ?? "Colombia";
  const email = profile?.email ?? user?.email ?? rawUser?.email ?? "";

  const badges = computeBadges(mySightings);

  const loadProfile = useCallback(async () => {
    if (!rawUser?.id) return;
    setProfileError(false);
    try {
      const p = await fetchProfile(rawUser.id);
      setProfile(p);
    } catch {
      setProfileError(true);
    }
  }, [rawUser?.id]);

  const loadGallery = useCallback(async () => {
    if (!rawUser?.id) return;
    setGalleryError(false);
    setLoadingGallery(true);
    try {
      const data = await fetchSightingsByUser(rawUser.id);
      setMySightings(data);
    } catch {
      setGalleryError(true);
      setMySightings([]);
    } finally {
      setLoadingGallery(false);
    }
  }, [rawUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const update = (patch: Partial<Profile>) =>
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La imagen no debe superar 3 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !rawUser?.id) return null;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.includes(".")
        ? avatarFile.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)
        : "jpg";
      const path = `public/avatars/${rawUser.id}.${ext || "jpg"}`;

      const { error } = await supabase.storage
        .from("sightings")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (error) throw error;

      const publicUrl = supabase.storage
        .from("sightings")
        .getPublicUrl(path).data.publicUrl;

      return publicUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el avatar.");
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    update({ avatarUrl: "" });
  };

  const handleSaveProfile = async () => {
    if (!rawUser?.id || !profile) return;
    setSaving(true);
    try {
      let avatarUrlToSave = profile.avatarUrl ?? "";
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (!uploaded) {
          setSaving(false);
          return;
        }
        avatarUrlToSave = uploaded;
      }

      const updated = await updateProfile(rawUser.id, {
        fullName: profile.fullName,
        academicProgram: profile.academicProgram,
        avatarUrl: avatarUrlToSave,
        bio: profile.bio,
        location: profile.location,
      });
      setProfile(updated);
      setAvatarFile(null);
      setAvatarPreview(null);

      const enriched = { ...(user ?? { fullName: "", academicProgram: "", email: "", password: "" }), avatarUrl: updated.avatarUrl };
      setCurrentUser(enriched as any);

      useSightingsStore.getState().setSightings(
        useSightingsStore.getState().sightings.map((s) =>
          s.author.id === rawUser.id
            ? { ...s, author: { ...s.author, avatarUrl: updated.avatarUrl } }
            : s,
        ),
      );

      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const stats = [
    { label: "Publicaciones", value: mySightings.length },
    {
      label: "Especies",
      value: new Set(mySightings.map((s) => s.species || s.commonName)).size,
    },
    { label: "Categorías", value: new Set(mySightings.map((s) => s.category)).size },
  ];

  return (
    <div className="w-full space-y-5">
      <div aria-live="polite" className="space-y-5">
        <div className="animate-fade-up rounded-2xl border border-white/5 bg-forest-900/60 p-5">
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

          {profileError ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-300">No se pudo cargar el perfil.</p>
              <Button variant="primary" onClick={loadProfile} className="shrink-0">
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <TextField
                label="Nombre completo"
                name="fullName"
                value={profile?.fullName ?? ""}
                onChange={(e) => update({ fullName: e.target.value })}
                placeholder="Nombre completo"
              />
              <TextField
                label="Programa académico"
                name="academicProgram"
                value={profile?.academicProgram ?? ""}
                onChange={(e) => update({ academicProgram: e.target.value })}
                placeholder="Biología / Ingeniería Forestal..."
              />

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-200">Avatar</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="shrink-0"
                  >
                    <Camera size={16} /> {uploadingAvatar ? "Subiendo..." : avatarFile ? "Cambiar avatar" : "Subir avatar"}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={removeAvatar}
                      className="shrink-0 text-red-300 hover:text-red-200"
                    >
                      <Trash2 size={16} /> Quitar
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
                {(avatarPreview || avatarUrl) && (
                  <div className="mt-2">
                    <img
                      src={avatarPreview ?? avatarUrl ?? ""}
                      alt="Preview avatar"
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
                    />
                  </div>
                )}
              </div>

              <label className="block text-sm text-slate-200">
                <span className="mb-1 block font-medium">Bio</span>
                <textarea
                  name="bio"
                  value={profile?.bio ?? ""}
                  onChange={(e) => update({ bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-forest-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-bio-500"
                  placeholder="Cuéntanos sobre ti"
                />
              </label>
              <TextField
                label="Ubicación"
                name="location"
                value={profile?.location ?? ""}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="Ciudad / País"
              />
            </div>
          )}

          {!profileError && (
            <Button className="mt-3 w-full" onClick={handleSaveProfile} disabled={saving || uploadingAvatar}>
              <Pencil size={16} /> {saving || uploadingAvatar ? "Guardando..." : "Guardar cambios"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-fade-up rounded-2xl border border-white/5 bg-forest-900/60 p-4 text-center"
            >
              <p className="text-2xl font-bold text-slate-50">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>

        <div>
          <h2 className="mb-2 text-lg font-bold text-slate-50">
            Mis avistamientos
          </h2>
          {galleryError ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-300">No se pudo cargar tu galería.</p>
              <Button variant="primary" onClick={loadGallery} className="mt-3">
                Reintentar
              </Button>
            </div>
          ) : loadingGallery ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-xl" />
              ))}
            </div>
          ) : mySightings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-forest-900/40 p-6 text-center">
              <Leaf size={40} className="mb-2 text-bio-400" aria-hidden="true" />
              <p className="text-sm text-slate-300">
                Aún no has publicado avistamientos.
              </p>
              <Button variant="primary" onClick={() => navigate("/publish")} className="mt-3">
                Publicar avistamiento
              </Button>
            </div>
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
    </div>
  );
}

