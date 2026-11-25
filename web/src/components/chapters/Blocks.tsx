import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { getChapterGuide } from '@/lib/site-content';

/**
 * Building blocks shared by the Chapters pages, so the hub, the guides and
 * the city pages read as one set.
 */

type Tone = 'dark' | 'light' | 'sand';
const SECTION: Record<Tone, string> = {
  dark: 'grain relative isolate overflow-hidden bg-ink text-white',
  light: 'bg-cream',
  sand: 'bg-cream-deep',
};

export function Band({
  tone = 'light',
  eyebrow,
  title,
  accent,
  lede,
  id,
  children,
}: {
  tone?: Tone;
  eyebrow?: string;
  title?: string;
  accent?: string;
  lede?: ReactNode;
  id?: string;
  children?: ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <section id={id} className={`${SECTION[tone]} scroll-mt-24 py-16 lg:py-24`}>
      <Container className={dark ? 'relative z-10' : undefined}>
        {(eyebrow || title) && (
          <Reveal>
            {eyebrow && <Eyebrow tone={dark ? 'light' : 'dark'}>{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="display max-w-3xl text-[clamp(1.75rem,3.4vw,2.5rem)]">
                {title}
                {accent && (
                  <>
                    {' '}
                    <span className={`font-serif font-normal italic ${dark ? 'text-sand' : 'text-sand-deep'}`}>{accent}</span>
                  </>
                )}
              </h2>
            )}
            {lede && (
              <p className={`mt-5 max-w-2xl text-[0.9375rem] leading-relaxed ${dark ? 'text-white/65' : 'text-ink-mute'}`}>{lede}</p>
            )}
          </Reveal>
        )}
        {children}
      </Container>
    </section>
  );
}

/** A row of short cards: label (optional), title, one line. */
export function Cards({
  items,
  tone = 'light',
  cols = 3,
}: {
  items: { label?: string; title: string; body?: string }[];
  tone?: 'light' | 'dark';
  cols?: 2 | 3 | 4 | 5 | 6;
}) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-5', 6: 'sm:grid-cols-3 lg:grid-cols-6' }[cols];
  const card = tone === 'dark' ? 'border border-white/10 bg-white/[0.04] text-white' : 'bg-white shadow-sm ring-1 ring-ink/[0.06]';
  return (
    <ul className={`mt-10 grid gap-4 ${grid}`}>
      {items.map((item, i) => (
        <li key={item.title}>
          <Reveal delay={(i % 6) * 50} className="h-full">
            <div className={`h-full rounded-[1.25rem] p-6 ${card}`}>
              {item.label && (
                <p className={`font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${tone === 'dark' ? 'text-sand/80' : 'text-sand-deep'}`}>
                  {item.label}
                </p>
              )}
              <h3 className={`text-[1.0625rem] font-bold leading-snug tracking-tight ${item.label ? 'mt-3' : ''}`}>{item.title}</h3>
              {item.body && (
                <p className={`mt-2 text-sm leading-relaxed ${tone === 'dark' ? 'text-white/65' : 'text-ink-mute'}`}>{item.body}</p>
              )}
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps, for sequences where order matters. */
export function Steps({ steps, tone = 'light' }: { steps: string[]; tone?: 'light' | 'dark' }) {
  return (
    <Cards
      tone={tone}
      cols={steps.length === 6 ? 6 : steps.length === 5 ? 5 : 4}
      items={steps.map((title, i) => ({ label: String(i + 1).padStart(2, '0'), title }))}
    />
  );
}

/** Small print under a section. */
export function Note({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <Reveal delay={100}>
      <p className={`mt-8 max-w-3xl text-sm leading-relaxed ${tone === 'dark' ? 'text-white/55' : 'text-ink-mute'}`}>{children}</p>
    </Reveal>
  );
}

/**
 * The four ways in, closing every Chapters page. Start a Chapter is the
 * primary action, so it gets the dark card.
 */
export async function JoinActions({ title = 'Be part of it.', lede }: { title?: string; lede?: string }) {
  const { joinActions } = await getChapterGuide();
  if (!joinActions.length) return null;
  return (
    <Band tone="sand" eyebrow="Get Involved" title={title} lede={lede}>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {joinActions.map((action, i) => {
          const primary = i === 0;
          return (
            <li key={action.href}>
              <Reveal delay={i * 60} className="h-full">
                <Link
                  href={action.href}
                  className={`group flex h-full flex-col justify-between rounded-[1.5rem] p-7 transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 ${
                    primary ? 'bg-ink text-white' : 'bg-white shadow-sm ring-1 ring-ink/[0.06]'
                  }`}
                >
                  <span>
                    {primary && <span className="eyebrow mb-3 block text-sand">Start here</span>}
                    <span className="block text-lg font-bold tracking-tight">{action.title}</span>
                    <span className={`mt-2 block text-sm leading-relaxed ${primary ? 'text-white/65' : 'text-ink-mute'}`}>{action.body}</span>
                  </span>
                  <span className="mt-6 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em]">
                    {primary ? 'Apply' : 'Go'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** Links to the other guide pages; the current one is left out. */
export async function GuideLinks({ current }: { current?: string }) {
  const guides = (await getChapterGuide()).guides.filter((g) => g.href !== current);
  return (
    <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((g) => (
        <li key={g.href}>
          <Link
            href={g.href}
            className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white px-5 py-4 transition hover:border-ink/30"
          >
            <span className="flex items-center justify-between gap-3 text-sm font-bold">
              {g.title}
              <span aria-hidden>→</span>
            </span>
            <span className="mt-1 text-sm text-ink-mute">{g.body}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
