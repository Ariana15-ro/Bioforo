import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BiodiversityMap } from "@/components/map/BiodiversityMap";
import { useSightingsStore } from "@/store/sightingsStore";
import type { Sighting } from "@/types";

/** Category chips for filtering the map markers. */
const CATEGORIES = [
  "Todas",
  "Flora",
  "Fauna",
  "Aves",
  "Insectos",
  "Ecosistemas",
] as const;

/**
 * Map screen. Shows sighting pins on the functional map, with search +
 * category filtering, and opens the PostDetailModal on pin click.
 * Route: /map
 */
export function MapPage() {
  const sightings = useSightingsStore((s) => s.sightings);

  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");

  // Debounce the search term (300ms).
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const visible: Sighting[] = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sightings.filter((s) => {
      const hasCoords = s.latitude !== 0 || s.longitude !== 0;
      const matchesCategory =
        activeCategory === "Todas" || s.category === activeCategory;
      const matchesSearch =
        term === "" ||
        s.commonName.toLowerCase().includes(term) ||
        s.species.toLowerCase().includes(term) ||
        s.location.toLowerCase().includes(term);
      return hasCoords && matchesCategory && matchesSearch;
    });
  }, [sightings, searchTerm, activeCategory]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <label className="relative block">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ubicación..."
          aria-label="Buscar ubicación"
          className="w-full rounded-full border border-white/10 bg-forest-900/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-bio-500"
        />
      </label>

      {/* Category chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
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

      {/* Map */}
      <div className="relative h-[72vh] overflow-hidden rounded-2xl border border-white/10 lg:h-[calc(100vh-13rem)]">
        <BiodiversityMap
          sightings={visible}
          className="h-full w-full"
        />
      </div>

      <p className="text-sm text-slate-400">
        {visible.length === 0
          ? "No hay avistamientos que coincidan con la búsqueda."
          : `${visible.length} avistamiento${visible.length === 1 ? "" : "s"} en el mapa`}
      </p>
    </div>
  );
}
