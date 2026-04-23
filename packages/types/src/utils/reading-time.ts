/**
 * Reading-time estimate for academy text lessons.
 *
 * We don't persist this in the DB — it's derived from the lesson content
 * on every read so it stays in sync as editors change the markdown. The
 * seed script uses the same formula so seeded rows and admin-edited rows
 * agree on what "N min" means.
 *
 * 200 wpm is the standard reading speed for adult native speakers on
 * non-technical prose. Good-enough default; over-precision isn't useful
 * when the UI rounds to whole minutes anyway.
 */
const DEFAULT_WPM = 200;

export function computeReadingTimeMinutes(
  content: string | null | undefined,
  wpm: number = DEFAULT_WPM,
): number {
  if (!content) return 1;
  // Strip common markdown token sugar before counting so fenced code
  // blocks and image alt-text don't inflate the estimate. This is
  // deliberately coarse — real reader speed on code differs from prose,
  // but refining that isn't worth the complexity.
  const prose = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~`-]/g, " ");
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / wpm));
}
