interface HeroVideoSourcesProps {
  /**
   * Path to the H.264 `.mp4` (the universal fallback). Sibling `.av1.mp4` and
   * `.webm` files are offered ahead of it when `videoSrc` is an `.mp4`, so modern
   * browsers fetch a much smaller file.
   */
  videoSrc: string;
}

/**
 * Emits `<source>` elements smallest-first: VP9/WebM (~26% smaller than H.264),
 * then the H.264 `.mp4` that plays everywhere. The browser downloads only the
 * first source it can decode, and the `codecs=` hint lets a browser without VP9
 * skip the WebM and fall through to the `.mp4`.
 *
 * AV1 is deliberately omitted: it encodes ~half the size, but `canPlayType`
 * over-reports AV1 support on a slice of browsers, which then stall on decode
 * *without* firing `error` or falling back — a blank hero. VP9's capability
 * reporting is trustworthy, so WebM is the safe first choice. (An AV1 encode
 * can be re-introduced behind a runtime decode probe if the size win is wanted.)
 *
 * The WebM path is derived from the `.mp4` by swapping the extension
 * (`/videos/hero.mp4` → `/videos/hero.webm`). If `videoSrc` isn't an `.mp4`,
 * only it is emitted.
 */
export function HeroVideoSources({ videoSrc }: HeroVideoSourcesProps) {
  const webm = /\.mp4$/i.test(videoSrc)
    ? videoSrc.replace(/\.mp4$/i, ".webm")
    : null;

  return (
    <>
      {webm && (
        <source src={webm} type='video/webm; codecs="vp9, opus"' />
      )}
      <source src={videoSrc} type="video/mp4" />
    </>
  );
}
