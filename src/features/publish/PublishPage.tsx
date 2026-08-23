import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Crosshair, Image as ImageIcon, MapPin } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/common/Spinner";
import { TextField } from "@/components/ui/TextField";
import { useAuthStore } from "@/store/authStore";
import { useSightingsStore } from "@/store/sightingsStore";
import { supabase } from "@/lib/supabase";
import { createSighting } from "@/lib/supabaseQueries";
import { processImage } from "@/lib/imageUtils";
import type { Category, Sighting } from "@/types";

const CATEGORIES: Category[] = [
  "Flora",
  "Fauna",
  "Aves",
  "Insectos",
  "Ecosistemas",
];

const publishSchema = z.object({
  imageUrl: z.string().min(1, "Agrega una foto de la especie"),
  commonName: z.string().min(2, "Ingresa el nombre de la especie"),
  scientificName: z.string().optional(),
  category: z.string().min(1, "Selecciona una categoría"),
  description: z.string().min(10, "Describe con al menos 10 caracteres"),
  location: z.string().min(2, "Indica el lugar del avistamiento"),
});

type PublishValues = z.infer<typeof publishSchema>;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el límite de 8 MB.");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("Debes iniciar sesión para subir imágenes.");
  }

  const ext = "jpg";
  const path = `public/sightings/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("sightings")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  if (!data?.path) {
    throw new Error("La subida no devolvió una ruta de archivo.");
  }

  const publicUrl = supabase.storage
    .from("sightings")
    .getPublicUrl(data.path).data.publicUrl;
  return publicUrl;
}

export function PublishPage() {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PublishValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: { imageUrl: "", commonName: "", scientificName: "", category: "", description: "", location: "" },
  });

  const imageUrl = watch("imageUrl");
  const category = watch("category");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setPreviewUrl("");
    try {
      const processed = await processImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8, mimeType: "image/jpeg" });
      const uploaded = await uploadImage(processed);
      setPreviewUrl(uploaded);
      setValue("imageUrl", uploaded, { shouldValidate: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo procesar o subir la imagen.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setPreviewUrl("");
    setValue("imageUrl", "", { shouldValidate: true });
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setCoords(null);
        toast.error("No se pudo obtener tu ubicación. Activa el GPS o escribe el lugar manualmente.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const onSubmit = async (values: PublishValues) => {
    const { user } = useAuthStore.getState();

    if (!user?.id) {
      toast.error("Debes iniciar sesión para publicar.");
      return;
    }

    try {
      const created = await createSighting({
        commonName: values.commonName,
        scientificName: values.scientificName ?? null,
        category: values.category,
        description: values.description,
        location: values.location,
        imageUrl,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });

      const optimistic: Sighting = {
        ...created,
        author: {
          id: user.id,
          username: user.email?.split("@")[0] ?? "usuario",
          displayName:
            (user.user_metadata?.full_name as string) || "Usuario",
        },
      };
      useSightingsStore.getState().prependSighting(optimistic);

      toast.success("Avistamiento publicado correctamente");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo publicar.";
      toast.error(msg);
    }
  };

  const busy = isSubmitting || uploading;

  return (
    <div className="w-full space-y-4 md:max-w-2xl" aria-live="polite">
      <div className="animate-fade-up space-y-4">
        <h1 className="text-2xl font-bold text-slate-50">Publicar avistamiento</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Photo upload */}
          <div className="animate-fade-up rounded-2xl border border-dashed border-white/20 bg-forest-900/40 transition hover:border-bio-500/40">
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="h-52 w-full rounded-2xl object-cover"
                />
                {uploading && (
                  <div className="absolute inset-0 grid place-items-center rounded-2xl bg-forest-950/60 backdrop-blur-sm">
                    <Spinner className="h-8 w-8 text-bio-300" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Quitar foto"
                  className="absolute right-2 top-2 bg-forest-950/70 px-3 py-1.5 text-xs backdrop-blur"
                  onClick={clearImage}
                  disabled={uploading}
                >
                  Quitar
                </Button>
              </div>
            ) : uploading ? (
              <div className="grid h-52 place-items-center">
                <Spinner className="h-8 w-8 text-bio-300" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4">
                <Button type="button" variant="ghost" onClick={() => cameraRef.current?.click()} className="hover:border-bio-500/40">
                  <Camera size={18} /> Tomar foto
                </Button>
                <Button type="button" variant="ghost" onClick={() => galleryRef.current?.click()} className="hover:border-bio-500/40">
                  <ImageIcon size={18} /> Galería
                </Button>
              </div>
            )}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFile}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
            {errors.imageUrl && (
              <p className="mt-2 px-1 text-xs text-red-400">{errors.imageUrl.message}</p>
            )}
          </div>

          <TextField
            label="Nombre de la especie"
            placeholder="Guacamaya tricolor"
            error={errors.commonName?.message}
            {...register("commonName")}
          />

          <TextField
            label="Nombre científico (opcional)"
            placeholder="Ara macao"
            error={errors.scientificName?.message}
            {...register("scientificName")}
          />

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-200">Categoría</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = cat === category;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setValue("category", cat, { shouldValidate: true })}
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
            {errors.category && (
              <p className="mt-1 text-xs text-red-400">{errors.category.message}</p>
            )}
          </div>

          <label className="block text-sm text-slate-200">
            <span className="mb-1 block font-medium">Descripción</span>
              <textarea
                rows={4}
                placeholder="Comportamiento, características, hábitat…"
                className="w-full rounded-xl border border-white/15 bg-forest-950/60 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-bio-500 break-words"
                {...register("description")}
              />
            {errors.description && (
              <span className="mt-1 block text-xs text-red-400">
                {errors.description.message}
              </span>
            )}
          </label>

          <TextField
            label="Nombre del lugar"
            placeholder="Reserva Natural El Tuparro"
            error={errors.location?.message}
            {...register("location")}
          />

          <Button type="button" variant="primary" className="w-full" aria-label="Obtener ubicación GPS" onClick={getLocation}>
            <Crosshair size={18} /> Obtener ubicación GPS
          </Button>

          <div className="relative grid h-36 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-forest-800 transition hover:border-white/20">
            <MapPin size={28} className="text-bio-400" />
            <span className="absolute bottom-2 px-2 text-center text-xs text-slate-300">
              {coords
                ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                : "Ubicación no capturada"}
            </span>
          </div>

          <Button type="submit" className="w-full" disabled={busy} aria-label="Publicar avistamiento">
            {busy ? "Publicando…" : "Publicar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
