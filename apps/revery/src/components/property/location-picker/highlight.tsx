import type { ReactNode } from "react";

/**
 * Wraps occurrences of `query` (case-insensitive) inside `text` with a `<mark>`
 * node so search-result rows highlight the matched substring. No-ops for
 * queries under 2 characters to avoid painting every letter.
 */
export function highlightMatches(text: string, query: string): ReactNode {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-yellow-200 text-foreground rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
