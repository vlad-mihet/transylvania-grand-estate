type Props = {
  src: string;
  title: string;
};

/**
 * 16:9 embed frame for video lessons. The API persists a canonicalised
 * embed URL on an allowlisted host (youtube-nocookie or player.vimeo), so
 * this component is only ever handed a known-safe origin. The sandbox
 * attribute is still tight — allow-scripts + allow-same-origin are the
 * minimum the embed needs to run; top-navigation / popups stay blocked.
 */
export function LessonVideoPlayer({ src, title }: Props) {
  return (
    <div className="mt-6 aspect-video overflow-hidden rounded-lg bg-black">
      <iframe
        src={src}
        title={title}
        className="h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
        allowFullScreen
      />
    </div>
  );
}
