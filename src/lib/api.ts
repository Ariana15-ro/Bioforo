/**
 * API client stub.
 * No business logic yet — this is the place to wire real HTTP calls later
 * (e.g. fetch wrappers around a BioForo backend).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,
  get: apiGet,
};
