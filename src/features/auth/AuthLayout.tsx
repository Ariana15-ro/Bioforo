import type { ReactNode } from "react";
import { Logo } from "../../components/common/Logo";

/**
 * Temporary forest/jungle background (Unsplash). A dark gradient overlay keeps
 * text legible; if the remote image fails, the forest gradient still shows.
 */
const FOREST_IMG =
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80";

/**
 * Shared layout for the auth screens.
 * - Mobile: full-bleed forest background with a centered form card.
 * - Desktop (md+): split view — forest image panel on the left, form panel
 *   on the right (keeps the brand aesthetic while looking professional).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Brand / image panel (desktop only) */}
      <div
        aria-hidden
        className="relative hidden w-1/2 bg-cover bg-center md:block"
        style={{ backgroundImage: `url(${FOREST_IMG})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950/70 to-forest-900/80" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Logo />
          <p className="max-w-sm text-lg leading-relaxed text-slate-200">
            Explora, registra y comparte avistamientos de biodiversidad con la
            comunidad BioForo.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Mobile background image + overlay */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url(${FOREST_IMG})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-forest-950/80 via-forest-950/70 to-forest-950/95 md:hidden"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
          <Logo className="mb-8 justify-center md:justify-start" />
          {children}
        </div>
      </div>
    </div>
  );
}
