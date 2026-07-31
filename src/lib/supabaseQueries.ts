import { supabase } from "@/lib/supabase";
import type { Comment, Sighting, SightingRow, User } from "@/types";

export function mapSightingRow(r: SightingRow, profilesMap?: Record<string, string>): Sighting {
  const author: User = {
    id: r.user_id ?? "anon",
    username: "usuario",
    displayName: profilesMap?.[r.user_id ?? ""] ?? "Usuario BioForo",
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
  const rows = (data as SightingRow[] | null) ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => id !== null && id !== "anon"))];
  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profilesData) {
      profilesMap = Object.fromEntries(
        profilesData.map((p: Record<string, unknown>) => [
          p.id as string,
          (p.full_name as string) ?? "Usuario BioForo",
        ]),
      );
    }
  }

  return rows.map((r) => mapSightingRow(r, profilesMap));
}

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

  const row = data as SightingRow;
  let displayName = "Usuario BioForo";
  if (row.user_id && row.user_id !== "anon") {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.user_id)
      .maybeSingle();
    if (profileData?.full_name) {
      displayName = profileData.full_name as string;
    }
  }

  const author: User = {
    id: row.user_id ?? "anon",
    username: "usuario",
    displayName,
  };

  return {
    id: row.id,
    species: row.scientific_name ?? "",
    commonName: row.species_name,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    location: row.location ?? "",
    category: (row.category as Sighting["category"]) ?? "Fauna",
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    createdAt: row.created_at,
    likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0,
    author,
  };
}

export async function fetchComments(sightingId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("sighting_id", sightingId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const userIds = [...new Set(rows.map((r) => (r.user_id as string) ?? "anon"))];

  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds.filter((id) => id !== "anon"));
    if (profilesData) {
      profilesMap = Object.fromEntries(
        profilesData.map((p: Record<string, unknown>) => [
          p.id as string,
          (p.full_name as string) ?? "Usuario BioForo",
        ]),
      );
    }
  }

  return rows.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    sightingId: c.sighting_id as string,
    authorId: (c.user_id as string) ?? "anon",
    authorName: profilesMap[(c.user_id as string) ?? "anon"] ?? "Usuario BioForo",
    text: c.comment as string,
    createdAt: c.created_at as string,
  }));
}

export async function addComment(
  sightingId: string,
  userId: string,
  text: string,
): Promise<Comment & { commentsCount: number }> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ sighting_id: sightingId, user_id: userId, comment: text })
    .select("*")
    .single();

  if (error) throw error;

  const { data: fresh } = await supabase
    .from("sightings")
    .select("comments_count, user_id, species_name")
    .eq("id", sightingId)
    .single();

  const commentsCount = Number((fresh as Record<string, unknown> | null)?.comments_count ?? 0);
  const ownerId = (fresh as Record<string, unknown> | null)?.user_id as string | undefined;

  if (ownerId && ownerId !== userId) {
    try {
      await supabase.from("notifications").insert({
        user_id: ownerId,
        actor_id: userId,
        type: "comment",
        sighting_id: sightingId,
        comment_text: text,
      });
    } catch {
      // no bloquear el comentario si la notificación falla
    }
  }

  return {
    id: data.id as string,
    sightingId: data.sighting_id as string,
    authorId: (data.user_id as string) ?? "anon",
    authorName: "Usuario BioForo",
    text: data.comment as string,
    createdAt: data.created_at as string,
    commentsCount,
  };
}

export async function fetchUserLikes(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("likes")
    .select("sighting_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((r: Record<string, unknown>) => r.sighting_id as string));
}

export async function toggleLike(
  sightingId: string,
  userId: string,
): Promise<{ liked: boolean; likesCount: number }> {
  const { data: existing } = await supabase
    .from("likes")
    .select("sighting_id")
    .eq("sighting_id", sightingId)
    .eq("user_id", userId)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("sighting_id", sightingId)
      .eq("user_id", userId);
    if (error) throw error;
    liked = false;
  } else {
    const { error } = await supabase
      .from("likes")
      .insert({ sighting_id: sightingId, user_id: userId });
    if (error) throw error;
    liked = true;
  }

  const { data: fresh } = await supabase
    .from("sightings")
    .select("likes_count, user_id, species_name")
    .eq("id", sightingId)
    .single();

  const likesCount = Number((fresh as Record<string, unknown> | null)?.likes_count ?? 0);
  const ownerId = (fresh as Record<string, unknown> | null)?.user_id as string | undefined;

  if (liked && ownerId && ownerId !== userId) {
    try {
      await supabase.from("notifications").insert({
        user_id: ownerId,
        actor_id: userId,
        type: "like",
        sighting_id: sightingId,
      });
    } catch {
      // no bloquear el like si la notificación falla
    }
  }

  return { liked, likesCount };
}

export async function fetchSightingById(id: string): Promise<Sighting | null> {
  const { data, error } = await supabase
    .from("sightings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as SightingRow;
  const author: User = {
    id: row.user_id ?? "anon",
    username: "usuario",
    displayName: "Usuario BioForo",
  };

  if (row.user_id && row.user_id !== "anon") {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", row.user_id)
      .maybeSingle();

    if (profileError) {
      console.warn("[fetchSightingById] profile query error for", row.user_id, profileError.message);
    } else if (profileData) {
      author.displayName = (profileData.full_name as string) || author.displayName;
      author.avatarUrl = (profileData.avatar_url as string) || undefined;
    } else {
      console.warn("[fetchSightingById] no profile row for", row.user_id);
    }
  }

  return {
    id: row.id,
    species: row.scientific_name ?? "",
    commonName: row.species_name,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    location: row.location ?? "",
    category: (row.category as Sighting["category"]) ?? "Fauna",
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    createdAt: row.created_at,
    likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0,
    author,
  };
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  academicProgram: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  academicProgram?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
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

export async function fetchProfile(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  return mapProfileRow(data);
}

export async function updateProfile(profileId: string, input: UpdateProfileInput): Promise<Profile> {
  const payload: Record<string, unknown> = {
    id: profileId,
  };
  if (input.fullName !== undefined) payload.full_name = input.fullName || null;
  if (input.academicProgram !== undefined) payload.academic_program = input.academicProgram || null;
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl || null;
  if (input.bio !== undefined) payload.bio = input.bio || null;
  if (input.location !== undefined) payload.location = input.location || null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return mapProfileRow(data);
}

export async function deleteSighting(id: string): Promise<void> {
  const { error } = await supabase.from("sightings").delete().eq("id", id);
  if (error) throw error;
}

export type NotificationType = "like" | "comment" | "nearby" | "follow";

export interface DbNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  sighting_id: string | null;
  comment_text: string | null;
  read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  userName: string;
  text: string;
  sightingName?: string;
  createdAt: string;
  read: boolean;
  sightingId?: string;
}

function buildNotificationText(
  type: NotificationType,
  sightingName?: string,
  commentText?: string | null,
): string {
  const quoted = sightingName ? ` «${sightingName}»` : "";
  switch (type) {
    case "like":
      return `le dio me gusta a tu avistamiento${quoted}`;
    case "comment":
      return `comentó en ${quoted}: «${(commentText ?? "").slice(0, 120)}»`;
    case "nearby":
      return `Nuevo avistamiento cerca${quoted}`;
    case "follow":
      return `empezó a seguirte`;
  }
}

function mapNotification(row: DbNotification, actorName: string, sightingName?: string): AppNotification {
  return {
    id: row.id,
    type: row.type,
    userName: actorName,
    text: buildNotificationText(row.type, sightingName, row.comment_text),
    sightingName,
    createdAt: row.created_at,
    read: row.read,
    sightingId: row.sighting_id ?? undefined,
  };
}

async function fetchActorName(actorId: string | null): Promise<string> {
  if (!actorId) return "Alguien";
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", actorId)
      .single();
    const name = (data?.full_name as string | undefined)?.trim();
    if (name) return name;
  } catch {
    // ignore
  }
  return "Alguien";
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, sighting:sightings!inner(species_name, scientific_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as (DbNotification & { sighting?: { species_name: string | null; scientific_name: string | null } })[];
  const mapped = await Promise.all(
    rows.map(async (row) => {
      const actorName = await fetchActorName(row.actor_id);
      const sightingName = row.sighting?.species_name ?? row.sighting?.scientific_name ?? undefined;
      return mapNotification(row, actorName, sightingName);
    }),
  );
  return mapped;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}
