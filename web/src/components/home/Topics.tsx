import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

/**
 * 06 / What We Talk About (homepage brief): back to black after the white
 * Chapters section. A concise list set as type, not an episode browser: no
 * pictures, no descriptions, no links. The names come from the CMS (Home page
 * → Topics), in order.
 */
export function Topics({ topics }: { topics: string[] }) {
  if (!topics.length) return null;
  return (
    <section aria-labelledby="topics-title" className="grain relative isolate overflow-hidden bg-ink py-20 text-white lg:py-32">
      <Container className="relative z-10">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="kicker mb-6 text-white/55">What We Talk About</p>
              <h2 id="topics-title" className="headline text-[clamp(2.25rem,5vw,3.75rem)]">
                Big topics. <span className="text-signal">Deeper conversations.</span>
              </h2>
            </div>
            <p className="text-[1rem] text-white/55 lg:pb-2">Nothing is off the table.</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          {/* An index, like a magazine's: two aligned columns (one on phones), number and name per row. */}
          <ol className="mt-12 grid border-t border-white/10 sm:grid-cols-2 sm:gap-x-12 lg:mt-16 lg:gap-x-20">
            {topics.map((topic, i) => (
              <li key={topic} className="flex items-baseline gap-5 border-b border-white/10 py-4 sm:gap-7 sm:py-5">
                <span aria-hidden className="w-7 shrink-0 text-[0.75rem] font-semibold tabular-nums tracking-[0.12em] text-signal">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-[clamp(2rem,4.4vw,3.75rem)] font-black leading-none tracking-[-0.035em]">{topic}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}
