import { Leaf } from "lucide-react";
import { cn } from "../../lib/utils";

/** BioForo wordmark + leaf glyph. */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-bio-500 text-forest-950">
        <Leaf size={18} />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-50">BioForo</span>
    </div>
  );
}
