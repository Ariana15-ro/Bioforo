import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

/** Loading spinner. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-bio-400", className)} />;
}
