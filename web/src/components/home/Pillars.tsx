import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Media } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';
import type { HomePillar } from '@/lib/site-content';

/**
 * 07 / Explore AntiSocial (homepage brief): a light section after the black
 * topics, with three visually consistent cards (Stories, Events, Shop). Cards,
 * photos and wording come from the CMS (Home cards); the photos are the team's
 * own: guests, events and the actual merch.
 */
export function Pillars({ pillars }: { pillars: HomePillar[] }) {
  if (!pillars.length) return null;
  return (
    <section aria-labelledby="explore-title" className="bg-paper py-20 text-ink lg:py-28">
      <Container>
        <h2 id="explore-title" className="kicker text-ink/60">
          Explore AntiSocial
        </h2>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3 lg:mt-12 lg:gap-8">
          {pillars.map((pillar, i) => (
            <li key={pillar.href}>
              <Reveal delay={i * 80} className="h-full">
                <Link href={pillar.href} className="group flex h-full flex-col">
                  <div className="relative overflow-hidden rounded-xl">
                    <Media
                      src={pillar.image}
                      alt={pillar.alt}
                      tone={i}
                      position={pillar.position}
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="aspect-[4/5] w-full"
                    />
                    <span aria-hidden className="absolute bottom-4 left-4 h-7 w-[3px] bg-signal" />
                  </div>
                  <div className="flex flex-1 flex-col pt-5">
                    <span className="text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-ink/40">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-2 font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em]">
                      {pillar.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-[0.9375rem] text-ink/60">{pillar.blurb}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.18em]">
                      <span className="link-underline">{pillar.cta}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="h-3 w-3 text-signal transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
