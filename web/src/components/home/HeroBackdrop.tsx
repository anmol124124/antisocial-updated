import { LAND, MAP_COLS, MAP_ROWS } from './worldMap';

/**
 * The hero's quiet background: the world as faint dots, a soft studio
 * spotlight from the top and a low red glow along the bottom. Kept dim and faded at the edges so the headline stays the
 * focus. Decorative only.
 */
export function HeroBackdrop() {
  const dots = { fill: 'none', strokeLinecap: 'round', strokeDasharray: '0.001 0.999' } as const;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Studio light from above. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(55% 60% at 50% 0%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 70%)' }}
      />
      {/* A low red glow along the bottom edge. */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'radial-gradient(60% 70% at 50% 100%, rgba(229,20,27,0.14) 0%, rgba(229,20,27,0) 70%)' }}
      />
      {/* The world, faint, in the lower part and fading out towards the edges. */}
      <div
        className="absolute left-1/2 top-[90%] w-[190%] sm:top-[78%] -translate-x-1/2 -translate-y-1/2 sm:w-[125%] lg:w-[110%]"
        style={{
          maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
        }}
      >
        <svg viewBox={`-0.5 -0.5 ${MAP_COLS} ${MAP_ROWS}`} className="block h-auto w-full">
          <path d={LAND} stroke="rgba(255,255,255,0.11)" strokeWidth={0.45} {...dots} />
        </svg>
      </div>
    </div>
  );
}
