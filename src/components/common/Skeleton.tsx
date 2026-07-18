import { cn } from "@/lib/utils";

/** Animated placeholder block used while content loads (shimmer effect). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-xl bg-white/5", className)}
      aria-hidden
    />
  );
}
