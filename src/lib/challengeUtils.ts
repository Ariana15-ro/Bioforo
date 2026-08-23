export type WeeklyChallengeCategory = "Todas" | "Flora" | "Fauna" | "Aves" | "Insectos" | "Ecosistemas";

export interface WeeklyChallenge {
  weekKey: string;
  category: WeeklyChallengeCategory;
  label: string;
  description: string;
}

const CHALLENGES: WeeklyChallenge[] = [
  { weekKey: "2024-W01", category: "Aves", label: "Aves", description: "Esta semana: Aves" },
  { weekKey: "2024-W02", category: "Flora", label: "Flora", description: "Esta semana: Flora" },
  { weekKey: "2024-W03", category: "Insectos", label: "Insectos", description: "Esta semana: Insectos" },
  { weekKey: "2024-W04", category: "Fauna", label: "Fauna", description: "Esta semana: Fauna" },
  { weekKey: "2024-W05", category: "Ecosistemas", label: "Ecosistemas", description: "Esta semana: Ecosistemas" },
];

export function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getActiveChallenge(): WeeklyChallenge | null {
  const key = getCurrentWeekKey();
  const found = CHALLENGES.find((c) => c.weekKey === key);
  if (found) return found;
  const fallbackIndex = Math.floor(Math.random() * CHALLENGES.length);
  return { ...CHALLENGES[fallbackIndex], weekKey: key };
}

export function isChallengeCompleted(sightings: { category: string; createdAt: string }[], challenge: WeeklyChallenge): boolean {
  if (challenge.category === "Todas") return sightings.length > 0;
  const challengeWeek = challenge.weekKey;
  return sightings.some((s) => {
    if (s.category !== challenge.category) return false;
    const created = new Date(s.createdAt);
    const createdKey = getWeekKeyFromDate(created);
    return createdKey === challengeWeek;
  });
}

function getWeekKeyFromDate(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
