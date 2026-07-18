import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/** Simple card surface used across feature screens. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-white/5 bg-forest-900/60 p-4", className)}
      {...props}
    />
  );
}
