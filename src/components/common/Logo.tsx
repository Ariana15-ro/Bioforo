import { cn } from "../../lib/utils";

/** BioForo logo from public icon. */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src="/icon.png" alt="BioForo" className="h-8 w-8 rounded-full object-cover" />
      <span className="text-lg font-bold tracking-tight text-slate-50">BioForo</span>
    </div>
  );
}
