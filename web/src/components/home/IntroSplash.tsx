import { IntroController } from './IntroController';

/**
 * "Breaking the silence": the first-visit intro on the home page. A dark stone
 * (the silence) appears, a red crack of light runs through it from one point,
 * it shatters, and the pieces fly apart to reveal the page.
 *
 * It is hidden unless <html> carries the `intro` class, which the inline
 * script in the root layout adds before the first paint: on the home page, on
 * a visitor's first visit, and never with reduced motion. So returning
 * visitors never see it flash. Pure CSS animation (globals.css, "intro");
 * IntroController ends it after ~3 s or on Skip and remembers the visit.
 */

/** The outline of the stone, clockwise, in a 400 × 300 box. */
const OUTLINE: [number, number][] = [
  [104, 104], [136, 74], [178, 56], [226, 50], [268, 60], [304, 84], [330, 116],
  [340, 156], [330, 194], [302, 226], [262, 246], [214, 254], [166, 248],
  [124, 230], [94, 198], [80, 158], [86, 128],
];
/** Where the crack starts: every piece breaks away from here. */
const CENTRE: [number, number] = [206, 150];

const pts = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(' ');

// One triangular piece per edge of the outline, all meeting at the centre.
const SHARDS = OUTLINE.map((p, i) => {
  const q = OUTLINE[(i + 1) % OUTLINE.length];
  const cx = (p[0] + q[0] + CENTRE[0]) / 3;
  const cy = (p[1] + q[1] + CENTRE[1]) / 3;
  const dx = cx - CENTRE[0];
  const dy = cy - CENTRE[1];
  const spread = 3.4 + (i % 3) * 0.9;
  return {
    points: pts([p, q, CENTRE]),
    // Each piece flies away from the centre and turns, a little differently.
    style: {
      '--dx': `${Math.round(dx * spread)}px`,
      '--dy': `${Math.round(dy * spread + 40)}px`,
      '--r': `${(i % 2 ? 1 : -1) * (18 + i * 7)}deg`,
    } as React.CSSProperties,
  };
});

const DEBRIS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.3;
  const d = 170 + (i % 4) * 60;
  return {
    r: 1.6 + (i % 3),
    style: { '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d + 30)}px`, '--r': '0deg' } as React.CSSProperties,
  };
});

// The crack: from the centre out to the edge, branch by branch.
const CRACKS = [2, 6, 9, 12, 15, 4, 11].map((i, n) => {
  const [x, y] = OUTLINE[i];
  // A slight kink halfway, so the lines read as cracks rather than spokes.
  const mx = (CENTRE[0] + x) / 2 + (n % 2 ? 7 : -6);
  const my = (CENTRE[1] + y) / 2 + (n % 2 ? -5 : 6);
  return { d: `M${CENTRE[0]} ${CENTRE[1]} L${mx} ${my} L${x} ${y}`, delay: `${0.6 + n * 0.08}s` };
});

export function IntroSplash() {
  return (
    <div id="intro" className="intro-screen">
      <div className="intro-stage" aria-hidden>
        <svg viewBox="0 0 400 300" className="h-auto w-[min(84vw,600px)] overflow-visible">
          <defs>
            <radialGradient id="intro-stone" cx="150" cy="95" r="240" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#8a8a8e" />
              <stop offset="0.5" stopColor="#3a3a3d" />
              <stop offset="1" stopColor="#141415" />
            </radialGradient>
            <radialGradient id="intro-light">
              <stop offset="0" stopColor="#ff3b3b" stopOpacity="0.95" />
              <stop offset="0.35" stopColor="#e5141b" stopOpacity="0.5" />
              <stop offset="1" stopColor="#e5141b" stopOpacity="0" />
            </radialGradient>
            {/* Rough edges and a lit, grainy surface, so the shape reads as rock. */}
            <filter id="intro-rock" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" seed="11" result="warp" />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale="12" xChannelSelector="R" yChannelSelector="G" result="rough" />
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="4" result="grain" />
              <feDiffuseLighting in="grain" surfaceScale="2.2" lightingColor="#d9d9d9" result="lit">
                <feDistantLight azimuth="225" elevation="38" />
              </feDiffuseLighting>
              <feComposite in="lit" in2="rough" operator="in" result="texture" />
              <feBlend in="texture" in2="rough" mode="multiply" />
            </filter>
            <filter id="intro-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* The pieces, hidden until the stone breaks. */}
          <g className="intro-shards" filter="url(#intro-rock)">
            {SHARDS.map((s, i) => (
              <polygon key={i} points={s.points} style={s.style} className="intro-shard" fill="url(#intro-stone)" stroke="#0b0b0c" strokeWidth="1" />
            ))}
          </g>

          {/* The whole stone, with the crack spreading across it. */}
          <g className="intro-whole">
            <polygon points={pts(OUTLINE)} fill="url(#intro-stone)" strokeLinejoin="round" filter="url(#intro-rock)" />
            <g filter="url(#intro-glow)">
              {CRACKS.map((c) => (
                <path key={c.d} d={c.d} className="intro-crack" style={{ animationDelay: c.delay }} fill="none" stroke="#e5141b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </g>
          </g>

          {/* The light that bursts out as it breaks. */}
          <circle cx={CENTRE[0]} cy={CENTRE[1]} r="40" className="intro-burst" fill="url(#intro-light)" />
          {/* Small chips of stone thrown out with the light. */}
          <g className="intro-shards">
            {DEBRIS.map((d, i) => (
              <circle key={i} cx={CENTRE[0]} cy={CENTRE[1]} r={d.r} className="intro-shard" style={d.style} fill={i % 3 ? '#6a6a6e' : '#e5141b'} />
            ))}
          </g>
        </svg>
        <p className="intro-word">Silence</p>
      </div>
      <IntroController />
    </div>
  );
}
