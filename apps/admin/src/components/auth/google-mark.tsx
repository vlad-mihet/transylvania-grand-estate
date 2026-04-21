/**
 * Google "G" monochrome mark. Inline SVG so we don't ship a brand asset for
 * a 180-char path used in two places. Swap for the official multi-color
 * wordmark once the brand team supplies an asset.
 */
export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 4.75c2.04 0 3.88.7 5.33 2.06l3.96-3.96C18.95 0.7 15.7 -0.5 12 -0.5 7.39 -0.5 3.4 2.08 1.39 5.84l4.62 3.58C6.99 6.6 9.26 4.75 12 4.75zM23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.12 2.73-2.39 3.58l3.69 2.86c2.15-1.99 3.72-4.93 3.72-8.68zM5.96 14.42a6.85 6.85 0 0 1-.37-2.17c0-.75.13-1.48.36-2.17L1.33 6.5A11.45 11.45 0 0 0 .5 12.25c0 1.85.45 3.6 1.23 5.14l4.23-3.02zM12 24c3.24 0 5.96-1.08 7.94-2.92l-3.69-2.86c-1.04.7-2.38 1.1-4.25 1.1-2.74 0-5.01-1.85-5.99-4.66l-4.6 3.57C3.3 21.93 7.39 24 12 24z" />
    </svg>
  );
}
