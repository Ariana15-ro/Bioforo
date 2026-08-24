import { create } from "zustand";

import { fetchSightings, type FetchSightingsOptions } from "@/lib/supabaseQueries";
import { getCachedFeed, setCachedFeed, type CachedSighting } from "@/lib/offlineCache";
import type { Sighting } from "@/types";

interface SightingsState {
  sightings: Sighting[];
  loading: boolean;
  hasMore: boolean;
  selectedId: string | null;
  setSightings: (s: Sighting[]) => void;
  prependSighting: (s: Sighting) => void;
  updateSighting: (s: Sighting) => void;
  openPost: (id: string) => void;
  closePost: () => void;
  removeSighting: (id: string) => void;
  loadMore: (opts?: Omit<FetchSightingsOptions, "offset">) => Promise<void>;
  reset: () => void;
  loadOfflineCache: () => void;
}

const PAGE_SIZE = 12;

/**
 * Shared sightings cache.
 * Fed by the Feed initial fetch (with pagination) and updated optimistically
 * on publish so newly created sightings appear immediately across screens.
 * `selectedId` drives the global PostDetailModal (single source of truth:
 * the modal reads the full Sighting from `sightings` by id).
 */
export const useSightingsStore = create<SightingsState>((set, get) => ({
  sightings: [],
  loading: false,
  hasMore: true,
  selectedId: null,
  setSightings: (sightings) => {
    set({ sightings, hasMore: sightings.length >= PAGE_SIZE });
    try {
      const cache: CachedSighting[] = sightings.map((s) => ({
        id: s.id,
        commonName: s.commonName,
        species: s.species || undefined,
        description: s.description,
        imageUrl: s.imageUrl,
        location: s.location,
        category: s.category,
        latitude: s.latitude,
        longitude: s.longitude,
        createdAt: s.createdAt,
        likes: s.likes,
        comments: s.comments,
        author: {
          id: s.author.id,
          displayName: s.author.displayName,
          avatarUrl: s.author.avatarUrl,
        },
      }));
      setCachedFeed(cache);
    } catch {
      // ignore cache errors
    }
  },
  prependSighting: (s) => set((state) => ({ sightings: [s, ...state.sightings] })),
  updateSighting: (s) =>
    set((state) => ({
      sightings: state.sightings.map((x) => (x.id === s.id ? s : x)),
    })),
  openPost: (id) => set({ selectedId: id }),
  closePost: () => set({ selectedId: null }),
  removeSighting: (id) =>
    set((state) => ({
      sightings: state.sightings.filter((s) => s.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  loadMore: async (opts = {}) => {
    if (get().loading || !get().hasMore) return;
    set({ loading: true });
    try {
      const next = await fetchSightings({
        ...opts,
        limit: PAGE_SIZE,
        offset: get().sightings.length,
      });
      set((state) => ({
        sightings: [...state.sightings, ...next],
        hasMore: next.length >= PAGE_SIZE,
      }));
    } catch {
      set({ hasMore: false });
    } finally {
      set({ loading: false });
    }
  },
  reset: () => set({ sightings: [], hasMore: true, loading: false, selectedId: null }),
  loadOfflineCache: () => {
    try {
      const cached = getCachedFeed();
      if (cached.length > 0 && get().sightings.length === 0) {
        set({ sightings: cached as unknown as Sighting[], hasMore: false });
      }
    } catch {
      // ignore
    }
  },
}));
