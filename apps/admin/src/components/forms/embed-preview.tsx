"use client";

import { normalizeLessonEmbedUrl } from "@tge/types/schemas/_primitives";

type EmbedPreviewProps = {
  url: string | null | undefined;
  title: string;
};

type PreviewState =
  | { kind: "empty" }
  | { kind: "valid"; canonical: string }
  | { kind: "invalid"; message: string };

function resolvePreview(raw: string | null | undefined): PreviewState {
  if (!raw || !raw.trim()) return { kind: "empty" };
  try {
    return { kind: "valid", canonical: normalizeLessonEmbedUrl(raw.trim()) };
  } catch (err) {
    return {
      kind: "invalid",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Live preview of the video that students will see. Runs the same
 * allowlist + canonicaliser the API uses, so editors see the exact URL
 * that will be stored (stripped of tracking params, upgraded to the
 * privacy-friendly embed host) before they save.
 */
export function EmbedPreview({ url, title }: EmbedPreviewProps) {
  const state = resolvePreview(url);

  if (state.kind === "empty") {
    return (
      <div className="mt-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Paste a YouTube or Vimeo URL above to preview the embed.
        </p>
      </div>
    );
  }

  if (state.kind === "invalid") {
    return (
      <div
        role="alert"
        className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
      >
        <p className="text-xs font-medium text-destructive">
          {state.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Only YouTube and Vimeo embeds are supported.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border border-border bg-black">
        <iframe
          src={state.canonical}
          title={title}
          className="h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Will be stored as{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
          {state.canonical}
        </code>
      </p>
    </div>
  );
}
