import { supabase } from "@/lib/supabase";
import type { Comment, Sighting, SightingRow, User } from "@/types";

/** Maps a DB sighting row into the app's domain `Sighting` type. */
export function mapSightingRow(r: SightingRow): Sighting {
  const author: User = {
    id: r.user_id ?? "anon",
    username: "usuario",
    displayName: "Usuario BioForo",
  };
  return {
    id: r.id,
    species: r.scientific_name ?? "",
    commonName: r.species_name,
    description: r.description ?? "",
    imageUrl: r.image_url ?? "",
    location: r.location ?? "",
    category: (r.category as Sighting["category"]) ?? "Fauna",
    latitude: r.latitude ?? 0,
    longitude: r.longitude ?? 0,
    createdAt: r.created_at,
    likes: r.likes_count ?? 0,
    comments: r.comments_count ?? 0,
    author,
  };
}

export interface FetchSightingsOptions {
  userId?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetches sightings ordered by `created_at` DESC, with optional filters
 * (owner, category, free-text search) and offset pagination.
 */
export async function fetchSightings({
  userId,
  category,
  search,
  limit = 12,
  offset = 0,
}: FetchSightingsOptions = {}): Promise<Sighting[]> {
  let query = supabase
    .from("sightings")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq("user_id", userId);
  if (category && category !== "Todas") query = query.eq("category", category);
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`species_name.ilike.${term},description.ilike.${term},location.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data as SightingRow[] | null) ?? []).map(mapSightingRow);
}

/** Inserts a new sighting and returns the created row. */
export async function createSighting(input: {
  userId: string;
  commonName: string;
  scientificName?: string | null;
  category: string;
  description: string;
  location: string;
  imageUrl: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<Sighting> {
  const { data, error } = await supabase
    .from("sightings")
    .insert({
      user_id: input.userId,
      species_name: input.commonName,
      scientific_name: input.scientificName?.trim() || null,
      category: input.category,
      description: input.description,
      location: input.location,
      image_url: input.imageUrl,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single();

  if (error) throw error;
  return mapSightingRow(data as SightingRow);
}

/** Fetches comments for a sighting, oldest first. */
export async function fetchComments(sightingId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("sighting_id", sightingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    sightingId: c.sighting_id as string,
    authorId: (c.user_id as string) ?? "anon",
    authorName: "Usuario BioForo",
    text: c.comment as string,
    createdAt: c.created_at as string,
  }));
}

/** Adds a comment and returns it. */
export async function addComment(
  sightingId: string,
  userId: string,
  text: string,
): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ sighting_id: sightingId, user_id: userId, comment: text })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id as string,
    sightingId: data.sighting_id as string,
    authorId: (data.user_id as string) ?? "anon",
    authorName: "Usuario BioForo",
    text: data.comment as string,
    createdAt: data.created_at as string,
  };
}

/** Returns the set of sighting ids the given user has liked. */
export async function fetchUserLikes(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("likes")
    .select("sighting_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((r: Record<string, unknown>) => r.sighting_id as string));
}

/** Toggles a like. Returns the new liked state. */
export async function toggleLike(
  sightingId: string,
  userId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("likes")
    .select("sighting_id")
    .eq("sighting_id", sightingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("sighting_id", sightingId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("likes")
    .insert({ sighting_id: sightingId, user_id: userId });
  if (error) throw error;
  return true;
}

/** Deletes a sighting. RLS only allows the owner to delete their own post. */
export async function deleteSighting(id: string): Promise<void> {
  const { error } = await supabase.from("sightings").delete().eq("id", id);
  if (error) throw error;
}
