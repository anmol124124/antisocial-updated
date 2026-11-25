import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Typewriter } from './Typewriter';

/**
 * 01 / Hero (homepage brief): black, no photograph. Large centred type that
 * writes each line, holds, backspaces and writes the next (lines from the CMS,
 * Home page → Hero lines), with both calls to action always visible beneath.
 */
export function Hero({ lines }: { lines: string[] }) {
  return (
    <section aria-labelledby="hero-title" className="grain relative isolate overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(60% 55% at 50% 45%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 70%)' }}
      />

      <Container className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center py-20 text-center sm:py-24">
        <p className="kicker mb-8 text-white/55 sm:mb-10">The conversation platform</p>

        <h1 id="hero-title" className="headline w-full max-w-[16ch] text-[clamp(2.9rem,9vw,7.5rem)]">
          <Typewriter lines={lines} className="justify-items-center" />
        </h1>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-14">
          <Button href="/episodes" variant="solid-light" arrow>
            Listen Now
          </Button>
          <Button href="/chapters" variant="outline-light" arrow>
            Start a Chapter
          </Button>
        </div>
      </Container>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-center justify-between px-12 pb-7 text-[0.625rem] font-semibold uppercase tracking-[0.32em] text-white/35 sm:flex"
      >
        <span>Dubai · India · USA</span>
        <span className="flex items-center gap-3">
          Scroll
          <span className="block h-px w-10 bg-white/30" />
        </span>
      </div>
    </section>
  );
}
