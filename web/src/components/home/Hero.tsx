import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Electric, Typewriter } from './Typewriter';
import { HeroBackdrop } from './HeroBackdrop';

/**
 * 01 / Hero (homepage brief, revised after the client's review): black, no
 * photograph. The statement in full, "They called us AntiSocial. / We decided
 * to talk.", with the reply typed in underneath: "Not anti-society.
 * Anti-silence." On a first visit it is revealed by the intro (IntroSplash).
 * Lines come from the CMS (Home page → Hero lines): the first two are the
 * statement, the rest is typed. Both calls to action always visible beneath.
 */
export function Hero({ lines }: { lines: string[] }) {
  const statement = lines.slice(0, 2);
  const reply = lines.slice(2).join(' ');
  return (
    <section aria-labelledby="hero-title" className="grain relative isolate overflow-hidden bg-ink text-white">
      <HeroBackdrop />

      <Container className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center py-20 text-center sm:py-24">
        <p className="kicker mb-8 text-white/55 sm:mb-10">The conversation platform</p>

        <h1 id="hero-title" className="headline w-full text-[clamp(2.5rem,5.8vw,5rem)]">
          <span className="sr-only">{statement.join(' ')}</span>
          {statement.map((line, i) => (
            <span key={line} aria-hidden className="block">
              {i > 0 && ' '}
              {/* White words still; the last (red) word hums with the line below. */}
              {line.slice(0, line.trimEnd().lastIndexOf(' ') + 1)}
              <span className="glitch-loop whitespace-nowrap" data-text={line.slice(line.trimEnd().lastIndexOf(' ') + 1)}>
                <Electric text={line.slice(line.trimEnd().lastIndexOf(' ') + 1)} redFrom={0} />
              </span>
            </span>
          ))}
          {reply && <span className="sr-only"> {reply}</span>}
        </h1>
        {reply && (
          <p className="mt-6 font-display text-[clamp(1.5rem,3.6vw,2.75rem)] font-extrabold tracking-[-0.03em] text-white/85 sm:mt-8">
            <Typewriter text={reply} className="justify-items-center" />
          </p>
        )}

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
