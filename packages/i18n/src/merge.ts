import type { Locale } from "./constants";

export type MessageTree = { [key: string]: string | MessageTree };

/**
 * Shared message bundle loader. Apps merge this with their own messages so
 * common UI copy (property types, status labels, etc.) stays DRY across
 * brands. Bundled via dynamic import so each locale lands in its own chunk.
 */
export async function loadSharedMessages(locale: Locale): Promise<MessageTree> {
  switch (locale) {
    case "en":
      return (await import("./messages/en.json")).default as MessageTree;
    case "ro":
      return (await import("./messages/ro.json")).default as MessageTree;
    case "de":
      return (await import("./messages/de.json")).default as MessageTree;
    case "fr":
      return (await import("./messages/fr.json")).default as MessageTree;
    default: {
      // Narrow-guard: if a new locale is added to `Locale` without a case
      // here, TS flags the assignment. Fall back to English at runtime.
      const _exhaustive: never = locale;
      void _exhaustive;
      return (await import("./messages/en.json")).default as MessageTree;
    }
  }
}

function isPlainObject(value: unknown): value is MessageTree {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Deep-merge two message trees with `overrides` winning on conflict. Used
 * to layer app-local copy on top of the shared bundle (e.g. Reveria's
 * `Common.propertyTypes.chalet: "Cabană"` override on RO).
 */
export function mergeMessages(
  base: MessageTree,
  overrides: MessageTree,
): MessageTree {
  const out: MessageTree = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = out[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = mergeMessages(existing, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
