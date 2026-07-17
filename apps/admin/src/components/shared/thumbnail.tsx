"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@tge/utils";

type ThumbnailSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<ThumbnailSize, string> = {
  sm: "w-12", // 48 × (48 * 3 / 4) = 48×36
  md: "w-14", // 56 × 42
  lg: "w-20", // 80 × 60
};

const SIZES_ATTR: Record<ThumbnailSize, string> = {
  sm: "48px",
  md: "56px",
  lg: "80px",
};

interface ThumbnailProps {
  src?: string | null;
  alt: string;
  size?: ThumbnailSize;
  className?: string;
}

/**
 * 4:3 landscape thumbnail used for property / article hero cells. Keeps the
 * same pixel sizes the admin was using inline (48×36 in table cells, 56×42
 * in mobile cards, 80×60 in detail heroes) while centralising the
 * next/image plumbing.
 *
 * Resilience: if `src` is missing OR the underlying request fails (404,
 * orphaned R2 object), the component falls back to the bg-muted box —
 * never a broken `<img>` with stray alt text.
 */
export function Thumbnail({
  src,
  alt,
  size = "sm",
  className,
}: ThumbnailProps) {
  const [errored, setErrored] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset on src change so a new URL gets a fresh attempt. Adjusting state
  // during render (React's "storing prior props" pattern) avoids the extra
  // effect + cascading re-render the react-hooks rule flags.
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrored(false);
  }

  const showImage = !!src && !errored;

  return (
    <div
      className={cn(
        "relative aspect-[4/3] shrink-0 overflow-hidden rounded-sm bg-muted",
        SIZE_CLASS[size],
        className,
      )}
    >
      {showImage && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={SIZES_ATTR[size]}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
