import { Fragment } from 'react';
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
          <ul className="mt-14 flex flex-wrap items-baseline gap-x-[0.35em] gap-y-1 border-t border-white/10 pt-12 font-display text-[clamp(2.25rem,6.2vw,5.25rem)] font-black leading-[1.08] tracking-[-0.04em] lg:mt-16 lg:pt-14">
            {topics.map((topic, i) => (
              <Fragment key={topic}>
                <li className="inline-flex items-start whitespace-nowrap">
                  <span aria-hidden className="mr-[0.18em] mt-[0.4em] hidden font-sans text-[0.16em] font-semibold tracking-[0.12em] text-signal sm:inline">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {topic}
                </li>
                {i < topics.length - 1 && (
                  <li aria-hidden className="text-signal">
                    /
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
