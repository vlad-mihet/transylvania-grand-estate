"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@tge/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";
type AvatarShape = "circle" | "rounded" | "square";
type AvatarFit = "cover" | "contain";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "h-8 w-8", // 32
  md: "h-10 w-10", // 40
  lg: "h-14 w-14", // 56
  xl: "h-16 w-16", // 64
};

const SIZES_ATTR: Record<AvatarSize, string> = {
  sm: "32px",
  md: "40px",
  lg: "56px",
  xl: "64px",
};

const SHAPE_CLASS: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-md",
  square: "rounded-sm",
};

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: AvatarSize;
  /** `circle` for people (default), `rounded` for logos, `square` for tight thumbnails. */
  shape?: AvatarShape;
  /** `cover` crops to fill (default, right for photos); `contain` fits without crop (right for logos). */
  fit?: AvatarFit;
  className?: string;
  /** Override the auto-derived initials. Pass `null` to render an empty disc. */
  fallback?: ReactNode;
  /** Ring variant — `copper` gives a subtle 1px copper ring. */
  ring?: "none" | "copper";
}

/**
 * Square-aspect avatar primitive. Single source of truth for table + card
 * avatars so pages stop hand-tuning `<Image width={32} height={32} style={{
 * width: 32, height: 32 }} />` pairs. Uses `fill` under a sized wrapper so
 * the rendered pixel size is stable across flex / grid contexts.
 *
 * Resilience: if `src` is missing OR the underlying request fails (orphaned
 * R2 URL, 404, network error), the component renders initials derived from
 * `alt` — never a broken image. Pass an explicit `fallback` to override.
 */
export function Avatar({
  src,
  alt,
  size = "md",
  shape = "circle",
  fit = "cover",
  className,
  fallback,
  ring = "none",
}: AvatarProps) {
  const [errored, setErrored] = useState(false);

  // Reset the error gate when the caller swaps in a new `src` so a fresh URL
  // gets a fresh chance — without this, a row whose photo was just replaced
  // would stay stuck on the fallback after one prior failure.
  useEffect(() => {
    setErrored(false);
  }, [src]);

  const showImage = !!src && !errored;
  const resolvedFallback =
    fallback === undefined ? deriveInitials(alt) : fallback;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        SIZE_CLASS[size],
        SHAPE_CLASS[shape],
        ring === "copper" &&
          "ring-1 ring-[color-mix(in_srgb,var(--color-copper)_40%,transparent)]",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={SIZES_ATTR[size]}
          className={fit === "contain" ? "object-contain" : "object-cover"}
          onError={() => setErrored(true)}
        />
      ) : resolvedFallback ? (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase text-muted-foreground">
          {resolvedFallback}
        </div>
      ) : null}
    </div>
  );
}

function deriveInitials(alt: string): string {
  const parts = alt.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}
