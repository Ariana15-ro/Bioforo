import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Species photo with a graceful fallback: if the remote image fails to load,
 * a leaf-colored placeholder is shown instead of a broken image icon.
 */
export function SpeciesImage({
  src,
  alt,
  className,
  fit = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-forest-800 text-bio-400",
          className,
        )}
        aria-label={alt}
      >
        <ImageOff size={32} />
      </div>
    );
  }

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(fitClass, "min-w-0", className)}
    />
  );
}
