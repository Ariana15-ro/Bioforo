import { supabase } from "@/lib/supabase";
import type { Sighting } from "@/types";

/** Datos de perfil expuestos a la UI (sin la password nativa de supabase). */
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  academicProgram: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
}

/** Input para actualizar perfil (todos opcionales excepto el id). */
export interface UpdateProfileInput {
  fullName?: string;
  academicProgram?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
}

/**
 * Fetch el perfil del usuario autenticado desde la tabla `profiles`.
 * Hace fallback a `user_metadata` si la tabla no existe todavía.
 */
export async function fetchMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, academic_program, location")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) {
    return {
      ...mapProfileRow(data),
      email: user.email ?? "",
    };
  }

  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: str(m.full_name) || str(m.fullName),
    academicProgram: str(m.academic_program) || str(m.academicProgram),
    avatarUrl: str(m.avatar_url) || undefined,
    bio: str(m.bio) || undefined,
    location: undefined,
  };
}

/**
 * Actualiza parcialmente el perfil del usuario autenticado en la tabla `profiles`.
 */
export async function updateMyProfile(input: UpdateProfileInput): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, full_name, avatar_url, bio, academic_program, location")
    .single();

  if (error) throw error;
  return {
    ...mapProfileRow(data),
    email: user.email ?? "",
  };
}

/**
 * Fetch avistamientos publicados por un usuario.
 */
export async function fetchSightingsByUser(userId: string): Promise<Sighting[]> {
  const { data, error } = await supabase
    .from("sightings")
    .select("id, species_name, scientific_name, description, image_url, location, category, latitude, longitude, created_at, likes_count, comments_count, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    species: (row.scientific_name as string) ?? "",
    commonName: row.species_name as string,
    description: (row.description as string) ?? "",
    imageUrl: (row.image_url as string) ?? "",
    location: (row.location as string) ?? "",
    category: (row.category as Sighting["category"]) ?? "Fauna",
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    createdAt: row.created_at as string,
    likes: Number(row.likes_count ?? 0),
    comments: Number(row.comments_count ?? 0),
    author: {
      id: userId,
      username: "",
      displayName: "",
    },
  }));
}

function mapProfileRow(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    email: (row.email as string) ?? "",
    fullName: (row.full_name as string) ?? "",
    academicProgram: (row.academic_program as string) ?? "",
    avatarUrl: (row.avatar_url as string) || undefined,
    bio: (row.bio as string) || undefined,
    location: (row.location as string) || undefined,
  };
}
