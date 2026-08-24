const CACHE_KEY = "bioforo_feed_cache";
const MAX_CACHED = 100;

export interface CachedSighting {
  id: string;
  commonName: string;
  species?: string;
  description: string;
  imageUrl: string;
  location: string;
  category: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  likes: number;
  comments: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export function getCachedFeed(): CachedSighting[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CachedSighting[];
  } catch {
    return [];
  }
}

export function setCachedFeed(sightings: CachedSighting[]): void {
  try {
    const trimmed = sightings.slice(0, MAX_CACHED);
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full or unavailable
  }
}

export function clearCachedFeed(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
