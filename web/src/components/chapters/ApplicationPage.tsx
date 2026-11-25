import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { ApplicationForm } from './ApplicationForm';
import { APPLICATIONS, COMMUNITY_OPTIONS, applicationHref, type ApplicationType } from '@/lib/chapters';

/** Shared page for Start a Chapter, the organiser application and the community forms. */
export function ApplicationPage({ type, aside }: { type: ApplicationType; aside?: ReactNode }) {
  const config = APPLICATIONS[type];
  const others = (['chapter_founder', ...COMMUNITY_OPTIONS] as ApplicationType[]).filter((t) => t !== type);

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <Container className="relative z-10 py-14 lg:py-20">
          <Link
            href={type === 'organiser' ? '/events' : '/chapters'}
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {type === 'organiser' ? 'AntiSocial Events' : 'AntiSocial Chapters'}
          </Link>
          <Reveal>
            <Eyebrow tone="light">{config.title}</Eyebrow>
            <h1 className="display max-w-3xl text-[clamp(2rem,5vw,3.5rem)]">
              {config.heading} <span className="font-serif font-normal italic text-sand">{config.accent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-white/70">{config.lede}</p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-cream py-14 lg:py-20">
        <Container>
          <div className={`grid gap-12 ${aside ? 'lg:grid-cols-[1.3fr_0.7fr] lg:gap-16' : ''}`}>
            <Reveal>
              <div className={`rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-10 ${aside ? '' : 'mx-auto max-w-3xl'}`}>
                <ApplicationForm type={type} />
              </div>
            </Reveal>
            {aside && <Reveal delay={100}>{aside}</Reveal>}
          </div>

          <Reveal delay={120}>
            <div className="mx-auto mt-14 max-w-3xl">
              <h2 className="eyebrow mb-5 text-ink-mute">Or take a different way in</h2>
              <ul className={`grid gap-3 ${others.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {others.map((t) => {
                  const o = APPLICATIONS[t];
                  return (
                    <li key={t}>
                      <Link
                        href={applicationHref(t)}
                        className="flex h-full items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-5 py-4 text-sm font-semibold transition hover:border-ink/30"
                      >
                        {o.title}
                        <span aria-hidden>→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
