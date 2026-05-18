"use client";

import { ListTree } from "lucide-react";
import { useEntryOutline } from "./entry-outline-provider";

/**
 * Document outline derived from the active editor's headings. Click to focus
 * + scroll the editor caret to that heading's position. Indent reflects the
 * heading level (H1 flush, H2 small indent, H3 deeper, H4 deepest).
 *
 * Renders an empty state when there are no headings — the prompt to add one
 * is implicit; a freshly-opened article naturally has none until the editor
 * mounts and publishes them.
 */
export function OutlineSidebar() {
  const { headings, jump } = useEntryOutline();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-1">
        <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Outline
        </p>
      </div>
      {headings.length === 0 ? (
        <p className="px-1 text-[11px] text-muted-foreground">
          Add headings with{" "}
          <kbd className="rounded border border-border bg-card px-1 text-[10px]">
            /
          </kbd>{" "}
          to jump between sections.
        </p>
      ) : (
        <nav aria-label="Document outline">
          <ul className="space-y-0.5 text-[12px]">
            {headings.map((heading, i) => (
              <li key={`${heading.pos}-${i}`}>
                <button
                  type="button"
                  onClick={() => jump(heading.pos)}
                  className="block w-full truncate rounded-sm px-2 py-1 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  style={{
                    paddingLeft: `${0.5 + (heading.level - 1) * 0.625}rem`,
                  }}
                  title={heading.text}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
