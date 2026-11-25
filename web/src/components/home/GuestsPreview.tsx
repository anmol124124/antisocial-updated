import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { GuestCard } from '@/components/guests/GuestCard';
import type { Guest } from '@/lib/content';

export function GuestsPreview({ guests }: { guests: Guest[] }) {
  return (
    <section aria-labelledby="guests-title" className="bg-cream py-20 lg:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <Eyebrow>Meet the Voices</Eyebrow>
            <h2 id="guests-title" className="display text-[clamp(2rem,4vw,3rem)]">
              They’ve been interviewed before.
              <br />
              <span className="font-serif font-normal italic text-sand-deep">Not like this.</span>
            </h2>
            <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-ink-mute">
              From founders and scientists to artists and athletes, we bring together people from
              different backgrounds to challenge perspectives and explore the stories behind the
              headlines.
            </p>
            <div className="mt-8">
              <Button href="/voices" variant="solid-dark" arrow>
                Meet the Voices
              </Button>
            </div>
          </Reveal>

          <Reveal delay={120}>
            {guests.length === 0 ? (
              <EmptyState
                title="Our first voices will be announced here."
                hint="Know someone we should talk to?"
                action={
                  <Button href="/community/speaker" variant="outline-dark" arrow>
                    Suggest a Speaker
                  </Button>
                }
              />
            ) : (
              // Three featured guests. On phones they sit in a swipeable rail
              // that bleeds to the screen edge (three tall portraits stacked
              // would be a very long scroll); from `sm` up, a three-column grid.
              <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:overflow-visible sm:px-0 sm:pb-0">
                {guests.slice(0, 3).map((guest, i) => (
                  <li key={guest.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
                    <GuestCard guest={guest} tone={i} />
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
