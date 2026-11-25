import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';


/**
 * Topics as type, not thumbnails: number and name, set big enough to read.
 *
 * Header runs full width above a 4-column grid, and the last cell is a
 * "suggest a topic" card two columns wide, so ten topics make an even 4×3.
 */
/** `topics`: the names from the CMS (Home page → Topics), in order. */
export function Topics({ topics }: { topics: string[] }) {
  if (!topics.length) return null;
  return (
    <section
      aria-labelledby="topics-title"
      className="grain relative isolate overflow-hidden bg-ink py-20 text-white lg:py-28"
    >
      <Container className="relative z-10">
        <Reveal>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow tone="light">What We Talk About</Eyebrow>
              <h2 id="topics-title" className="display text-[clamp(2rem,4vw,3rem)]">
                Big topics.{' '}
                <span className="font-serif font-normal italic text-sand">Deeper conversations.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-white/65">
                Nothing is off the table.
              </p>
            </div>
            <Button href="/episodes" variant="outline-light" arrow className="self-start lg:self-auto">
              Explore All Topics
            </Button>
          </div>
        </Reveal>

        <div className="mt-12 lg:mt-16">
          <ul className="grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic, i) => (
              <li key={topic} className="bg-ink">
                <Reveal delay={(i % 4) * 60} className="h-full">
                  <div className="flex h-full min-h-[8.5rem] flex-col justify-between gap-6 p-6 sm:min-h-[13rem] sm:p-7">
                    <span className="font-serif text-xl italic text-sand/80">{String(i + 1).padStart(2, '0')}</span>
                    <span className="block text-[1.375rem] font-bold tracking-tight">{topic}</span>
                  </div>
                </Reveal>
              </li>
            ))}
            <li className="bg-ink sm:col-span-2">
              <Reveal delay={(topics.length % 4) * 60} className="h-full">
                <Link
                  href="/community/question"
                  className="group flex h-full min-h-[8.5rem] flex-col justify-between gap-6 sm:min-h-[13rem] bg-sand p-6 text-ink sm:p-7 transition-colors duration-500 hover:bg-sand-light"
                >
                  <span className="eyebrow text-ink/60">Suggest a topic</span>
                  <span>
                    <span className="block font-serif text-[1.375rem] italic leading-snug">
                      Is there something we should be talking about?
                    </span>
                    <span className="mt-4 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em]">
                      Suggest a Topic
                      <Arrow />
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
