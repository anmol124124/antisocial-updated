'use client';

import { useRef, useState } from 'react';

/**
 * One player for two cases:
 *  - a published episode has a YouTube id, so we lazy-mount the iframe only
 *    after the visitor clicks (no third-party script on first paint);
 *  - an unpublished episode falls back to the local teaser clip. Our big play
 *    button starts it; after that the browser's own controls take over, so
 *    phones get seeking, volume, captions and fullscreen.
 */
export function EpisodePlayer({
  videoId,
  title,
  posterSrc,
  previewSrc,
  captionsSrc = null,
}: {
  videoId: string | null;
  title: string;
  posterSrc?: string;
  previewSrc?: string | null;
  /** WebVTT captions for the teaser, when there is a transcript. */
  captionsSrc?: string | null;
}) {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const poster = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : posterSrc;

  function toggleLocal() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
      setStarted(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  if (videoId && active) {
    return (
      <div className="grain relative aspect-video overflow-hidden rounded-[1.75rem] bg-ink shadow-2xl shadow-black/25">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="group relative aspect-video overflow-hidden rounded-[1.75rem] bg-ink shadow-2xl shadow-black/25">
      {videoId || !previewSrc ? (
        poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(55% 60% at 45% 45%, #9a8f86 0%, #4d453f 35%, #141110 80%)',
            }}
          />
        )
      ) : (
        <video
          ref={videoRef}
          poster={posterSrc}
          preload="metadata"
          playsInline
          controls={started}
          aria-label={`${title}: teaser`}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={previewSrc} type="video/mp4" />
          {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />}
        </video>
      )}

      {!started && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      )}

      {!started && (
      <button
        type="button"
        onClick={() => (videoId ? setActive(true) : toggleLocal())}
        aria-label={videoId ? `Play ${title} on YouTube` : playing ? 'Pause preview' : 'Play preview'}
        className="absolute left-1/2 top-1/2 grid h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-xl transition duration-300 hover:scale-105 hover:bg-white"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
            <path d="M6 4l14 8-14 8z" />
          </svg>
        )}
      </button>
      )}

      {!videoId && !started && (
        <span className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
          Teaser
        </span>
      )}
    </div>
  );
}
