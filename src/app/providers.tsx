import type { ReactNode } from "react";

/**
 * Global providers wrapper (theme, stores, etc.).
 * Add context providers here as the app grows (e.g. Zustand stores, QueryClient).
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
