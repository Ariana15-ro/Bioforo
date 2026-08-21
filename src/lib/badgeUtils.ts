import type { Sighting } from "@/types";

export interface Badge {
  label: string;
  icon: "compass" | "camera" | "leaf";
  color: string;
}

const BADGE_RULES: Array<{
  match: (sightings: Sighting[]) => boolean;
  badge: Badge;
}> = [
  {
    match: (sightings) => sightings.length >= 1,
    badge: {
      label: "Explorador",
      icon: "compass",
      color: "text-sky-300 bg-sky-500/15",
    },
  },
  {
    match: (sightings) => sightings.filter((s) => s.imageUrl).length >= 3,
    badge: {
      label: "Fotógrafo",
      icon: "camera",
      color: "text-amber-300 bg-amber-500/15",
    },
  },
  {
    match: (sightings) => {
      const categories = new Set(sightings.map((s) => s.category));
      return categories.size >= 3;
    },
    badge: {
      label: "Naturalista",
      icon: "leaf",
      color: "text-bio-300 bg-bio-500/15",
    },
  },
];

export function computeBadges(sightings: Sighting[]): Badge[] {
  return BADGE_RULES.filter((rule) => rule.match(sightings)).map((rule) => rule.badge);
}
