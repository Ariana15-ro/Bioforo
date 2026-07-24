/**
 * Shared domain types for BioForo.
 * These are placeholders for the upcoming business logic (auth, feed, sightingsâ€¦).
 */

/** A user account. */
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
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

/** Available sighting categories used by the feed chips. */
export type Category =
  | "Flora"
  | "Fauna"
  | "Aves"
  | "Insectos"
  | "Ecosistemas";

/** A biodiversity sighting published by a user. */
export interface Sighting {
  id: string;
  species: string; // scientific name
  commonName: string; // display title (e.g. "Guacamaya tricolor")
  description: string;
  imageUrl: string;
  location: string; // human-readable place (e.g. "Reserva Natural El Tuparro")
  category: Category;
  latitude: number;
  longitude: number;
  createdAt: string; // ISO date
  likes: number;
  comments: number;
  author: User;
}

/** Tab identifiers for the bottom navigation. */
export type TabKey = "feed" | "map" | "publish" | "notifications" | "profile";

/** A comment on a sighting. */
export interface Comment {
  id: string;
  sightingId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  commentsCount?: number;
}

/** Raw DB row for a sighting (snake_case). */
export interface SightingRow {
  id: string;
  user_id: string | null;
  species_name: string;
  scientific_name: string | null;
  category: string | null;
  description: string | null;
  location: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  likes_count: number | null;
  comments_count: number | null;
}
