import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { INDIA, LAND, MAP_COLS, MAP_ROWS, UAE, USA, mapPoint } from './worldMap';

/**
 * AntiSocial Chapters, the page's first white section (homepage brief,
 * section 05): the client's words beside a dotted world map with the USA,
 * India and Dubai picked out, and a line linking them.
 */
export function ChaptersFeature() {
  return (
    <section aria-labelledby="chapters-title" className="bg-white py-20 text-ink lg:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-16">
          <Reveal>
            <Eyebrow>AntiSocial Chapters</Eyebrow>
            <h2 id="chapters-title" className="display text-[clamp(2.25rem,5vw,4rem)]">
              Beyond the Screen.
            </h2>
            <p className="mt-5 font-serif text-[clamp(1.25rem,2.2vw,1.75rem)] italic leading-snug text-sand-deep">
              Different cities, different voices, one conversation.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="max-w-lg space-y-4 text-[0.9375rem] leading-relaxed text-ink-mute">
              <p>
                AntiSocial goes beyond the studio, bringing conversations into cities and communities
                around the world.
              </p>
              <p>
                Explore our chapters across Dubai, India and the USA, and discover how to bring
                AntiSocial to your city.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/chapters" variant="solid-dark" arrow>
                Explore Chapters
              </Button>
              <Button href="/chapters/start" variant="outline-dark" arrow>
                Start a Chapter
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <ChaptersMap />
        </Reveal>
      </Container>
    </section>
  );
}

type Side = 'top' | 'bottom';
const PLACES: { name: string; lon: number; lat: number; side: Side }[] = [
  { name: 'USA', lon: -98.5, lat: 39.5, side: 'top' },
  { name: 'Dubai', lon: 55.27, lat: 25.2, side: 'top' },
  { name: 'India', lon: 78.9, lat: 21.5, side: 'bottom' },
];

const LABEL: Record<Side, string> = {
  top: '-translate-x-1/2 -translate-y-[calc(100%+0.7rem)]',
  bottom: '-translate-x-1/2 translate-y-[0.7rem]',
};

/** Where a grid point sits, as a share of the map's width and height. */
const pct = ([x, y]: [number, number]) => ({ left: `${((x + 0.5) / MAP_COLS) * 100}%`, top: `${((y + 0.5) / MAP_ROWS) * 100}%` });

/**
 * The world as dots (see worldMap.ts), the USA, India and the UAE in black.
 * A dashed stroke puts one dot on every whole number along each run of land.
 *
 * Phones get a closer crop: the map is drawn wider than the screen and
 * shifted, so the Americas to India fill the width and the dots stay visible.
 * The markers and labels are HTML laid over it at the same percentages, so
 * the text stays a readable size at any width.
 */
function ChaptersMap() {
  const [usa, dubai, india] = PLACES.map((p) => mapPoint(p.lon, p.lat));
  const dots = { fill: 'none', strokeLinecap: 'round', strokeDasharray: '0.001 0.999' } as const;
  return (
    <div
      role="img"
      aria-label="World map with the AntiSocial chapters marked: Dubai, India and the USA"
      className="mt-14 overflow-hidden lg:mt-20"
    >
      {/* Phones: 156% wide, shifted 22% left, so about 129°W to 101°E shows. */}
      <div className="relative -ml-[22%] w-[156%] sm:ml-0 sm:w-full">
        <svg viewBox={`-0.5 -0.5 ${MAP_COLS} ${MAP_ROWS}`} className="block h-auto w-full" aria-hidden>
          <path d={LAND} stroke="rgba(11,11,12,0.16)" strokeWidth={0.5} {...dots} />
          <path d={`${USA}${INDIA}${UAE}`} stroke="#0b0b0c" strokeWidth={0.62} {...dots} />
          {/* One conversation: the USA to Dubai over the Atlantic, then on to India. */}
          <path
            d={`M${usa[0]} ${usa[1]}Q${(usa[0] + dubai[0]) / 2} 2 ${dubai[0]} ${dubai[1]}Q${(dubai[0] + india[0]) / 2} ${dubai[1] - 7} ${india[0]} ${india[1]}`}
            fill="none"
            stroke="#a38258"
            strokeWidth={1.25}
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {PLACES.map((p) => {
          const at = pct(mapPoint(p.lon, p.lat));
          return (
            <span key={p.name} aria-hidden className="absolute" style={at}>
              <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sand ring-[3px] ring-white" />
              <span
                className={`absolute whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-ink sm:text-[0.6875rem] ${LABEL[p.side]}`}
              >
                {p.name}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
