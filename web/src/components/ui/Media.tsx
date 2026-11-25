import Image from 'next/image';

/**
 * One image slot for the whole site. Directus is the only content source, so
 * `src` is often null (collection empty, CMS unreachable). Rather than a
 * broken image, we render the brand's grainy gradient placeholder with the
 * subject's initials — which is what the static site shipped with anyway.
 */
export function Media({
  src,
  alt,
  className = '',
  fallbackLabel,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  tone = 0,
  position,
  fit = 'cover',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  sizes?: string;
  priority?: boolean;
  tone?: number;
  /** CSS object-position, for wide photos in square slots, e.g. "31% 50%". */
  position?: string;
  /** "contain" shows the whole picture (e.g. a wide mockup in a square slot) on the light background. */
  fit?: 'cover' | 'contain';
}) {
  const gradients = [
    'radial-gradient(60% 60% at 50% 40%, #8d8d8d 0%, #4a4a4a 42%, #141414 100%)',
    'radial-gradient(60% 60% at 52% 38%, #cfc6ba 0%, #7c7168 42%, #241f1b 100%)',
    'radial-gradient(60% 60% at 48% 42%, #8ea4bf 0%, #4c6482 42%, #1b2634 100%)',
    'radial-gradient(60% 60% at 50% 40%, #b39c8a 0%, #6b5646 42%, #22190f 100%)',
    'radial-gradient(60% 60% at 50% 45%, #6a5b8f 0%, #2b2440 45%, #0a0810 100%)',
  ];

  return (
    <div className={`grain relative isolate overflow-hidden ${fit === 'contain' ? 'bg-[#f4efe7]' : 'bg-ink'} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          style={position ? { objectPosition: position } : undefined}
          className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.05]`}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 flex items-center justify-center transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.05]"
          style={{ background: gradients[tone % gradients.length] }}
        >
          {fallbackLabel && (
            <span className="font-serif text-4xl italic text-white/25 select-none">
              {fallbackLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** First letters of a name, for the placeholder above. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
