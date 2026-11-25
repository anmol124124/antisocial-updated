import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';

/** The dark banner every interior page opens with, so they read as one site. */
export function PageHero({
  eyebrow,
  title,
  accent,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <section className="grain relative isolate overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-24 h-[30rem] w-[30rem] rounded-full opacity-[0.14] blur-[110px]"
        style={{ background: 'radial-gradient(circle, #c8a67f 0%, transparent 70%)' }}
      />
      <Container className="relative z-10 py-16 lg:py-24">
        <Reveal>
          <Eyebrow tone="light">{eyebrow}</Eyebrow>
          <h1 className="display max-w-4xl text-[clamp(2.25rem,5.5vw,4rem)]">
            {title}
            {accent && (
              <>
                {' '}
                <span className="font-serif font-normal italic text-sand">{accent}</span>
              </>
            )}
          </h1>
          {lede && (
            <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-white/70">{lede}</p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </Container>
    </section>
  );
}
