import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/**
 * Primary button component (UI primitive).
 * Variants: primary (leaf green) and ghost.
 */
type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50";
  const variants: Record<Variant, string> = {
    primary: "bg-bio-500 text-forest-950 hover:bg-bio-400",
    ghost: "bg-white/5 text-slate-100 hover:bg-white/10",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
