import { useCallback } from "react";

export type ShareResult = {
  ok: boolean;
  method: "native" | "clipboard" | "unsupported";
};

function buildShareUrl(sightingId: string): string {
  if (typeof window === "undefined") return `/`;
  const url = new URL(window.location.origin + "/");
  url.searchParams.set("post", sightingId);
  return url.toString();
}

export function buildShareText(commonName: string, location: string): string {
  const title = commonName.trim();
  const place = location.trim();
  const base = `Mira este avistamiento en BioForo: ${title}${place ? ` (${place})` : ""}`;
  return base.slice(0, 160);
}

export async function shareSighting(
  sightingId: string,
  commonName: string,
  location: string,
): Promise<ShareResult> {
  const url = buildShareUrl(sightingId);
  const text = buildShareText(commonName, location);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: commonName.trim() || "Avistamiento BioForo",
        text,
        url,
      });
      return { ok: true, method: "native" };
    } catch {
      return { ok: false, method: "native" };
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: "clipboard" };
    } catch {
      return { ok: false, method: "clipboard" };
    }
  }

  return { ok: false, method: "unsupported" };
}

export function useShareSighting() {
  const handleShare = useCallback(
    async (sightingId: string, commonName: string, location: string) => {
      return shareSighting(sightingId, commonName, location);
    },
    [],
  );

  return { handleShare, buildShareUrl };
}
