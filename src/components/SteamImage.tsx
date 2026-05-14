import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a Steam CDN image (icon_url / icon_url_large) with:
 *   - skeleton placeholder while loading
 *   - fallback when src is missing or network errors
 *   - native lazy loading + async decoding
 *   - responsive `sizes` hint for the browser
 *
 * Pass `src` directly (already a full https URL).
 */
export function SteamImage({
  src,
  alt,
  className,
  imgClassName,
  loading = "lazy",
  sizes = "(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw",
  fetchpriority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  sizes?: string;
  fetchpriority?: "high" | "low" | "auto";
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const showFallback = errored || !src;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      {!loaded && !showFallback && (
        <div className="absolute inset-0 animate-pulse rounded-md bg-secondary/40" />
      )}
      {showFallback ? (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageOff className="h-6 w-6 opacity-60" />
          <span className="font-mono text-[9px] uppercase tracking-wider">No image</span>
        </div>
      ) : (
        <img
          src={src ?? undefined}
          alt={alt}
          loading={loading}
          decoding="async"
          sizes={sizes}
          // @ts-expect-error - fetchpriority is valid HTML attribute, types lag
          fetchpriority={fetchpriority}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "h-full w-full object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
