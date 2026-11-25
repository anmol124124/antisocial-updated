'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Media } from '@/components/ui/Media';

/**
 * The colour picked on a product page, shared by the pictures and the
 * add-to-cart block, so choosing Teal shows the teal hoodie.
 */

type ColourState = { color: string | null; setColor: (color: string) => void };

const ColourContext = createContext<ColourState | null>(null);

export function ProductColourProvider({ initial, children }: { initial: string | null; children: ReactNode }) {
  const [color, setColor] = useState(initial);
  return <ColourContext.Provider value={{ color, setColor }}>{children}</ColourContext.Provider>;
}

export const useProductColour = () => useContext(ColourContext);

export type GalleryImage = { src: string; alt: string; square: boolean };

/**
 * The pictures for the picked colour (the first colour's until one is picked):
 * the first large, the rest as thumbnails under it. The large one is a slider:
 * swipe, the arrows, the arrow keys or a thumbnail. A new colour starts again
 * at its first picture.
 */
export function ProductGallery({ galleries, fallback }: { galleries: Record<string, GalleryImage[]>; fallback: string }) {
  const picked = useProductColour()?.color;
  const shown = picked && galleries[picked]?.length ? picked : fallback;
  return <Slider key={shown} images={galleries[shown] || []} />;
}

function Slider({ images }: { images: GalleryImage[] }) {
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  // Keep the current thumbnail in view, without scrolling the page.
  useEffect(() => {
    const row = strip.current;
    const thumb = row?.children[index] as HTMLElement | undefined;
    if (row && thumb) row.scrollTo({ left: thumb.offsetLeft - (row.clientWidth - thumb.clientWidth) / 2, behavior: 'smooth' });
  }, [index]);

  const go = (i: number) => {
    const el = track.current;
    if (!el || !images.length) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  };
  // A swipe moves the track; the picture that settles in view is the current one.
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < images.length) setIndex(i);
  };

  const arrow = 'absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md transition hover:bg-white';
  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
          }}
          tabIndex={many ? 0 : -1}
          role="region"
          aria-roledescription="carousel"
          aria-label="Product photos"
          className="flex snap-x snap-mandatory overflow-x-auto rounded-[1.75rem] [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-sand [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div key={image.src} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} of ${images.length}`}>
              <Media
                src={image.src}
                alt={image.alt}
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                fit={image.square ? 'cover' : 'contain'}
                className="aspect-square w-full"
              />
            </div>
          ))}
        </div>
        {many && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(index - 1)} className={`${arrow} left-3`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-4 w-4">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" aria-label="Next photo" onClick={() => go(index + 1)} className={`${arrow} right-3`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-4 w-4">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span aria-live="polite" className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div ref={strip} className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, i) => (
            <button
              key={image.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === index ? 'ring-ink' : 'opacity-70 ring-transparent hover:opacity-100'}`}
            >
              <Media src={image.src} alt="" sizes="96px" className="aspect-square w-[4.5rem] sm:w-24" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
