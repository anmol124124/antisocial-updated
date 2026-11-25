import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { getRoadshowStops } from '@/lib/site-content';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  ...pageLinks('/roadshow'),
  title: 'Roadshow',
  description:
    'Chandigarh to Mumbai. Cars, conversations, and whoever’s brave enough to grab the mic.',
};

export default async function RoadshowPage() {
  // The stops, in route order (Roadshow stops in the CMS). The strip renders however many there are.
  const route = await getRoadshowStops();
  return (
    <>
      <PageHero
        eyebrow="AntiSocial Roadshow · India"
        title="We’re not waiting"
        accent="for you to find us."
        lede="Chandigarh to Mumbai. Cars, conversations, and whoever’s brave enough to grab the mic."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#route" variant="solid-light" arrow>
            See the Route
          </Button>
          <Button href="/community/community" variant="outline-light" arrow>
            Catch Us Live
          </Button>
        </div>
      </PageHero>

      <section id="route" className="scroll-mt-24 bg-cream py-16 lg:py-24">
        <Container>
          <Reveal>
            <Eyebrow>The Route</Eyebrow>
            <h2 className="display max-w-2xl text-[clamp(1.75rem,3.4vw,2.5rem)]">
              Chandigarh{' '}
              <span className="font-serif font-normal italic text-sand-deep">to Mumbai.</span>
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <ol className="relative mt-14 flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              {/* The road itself: vertical on phones, horizontal from `sm` up. */}
              <span
                aria-hidden
                className="absolute left-[0.6875rem] top-3 bottom-3 w-px border-l-2 border-dashed border-ink/20 sm:left-3 sm:right-3 sm:top-[0.6875rem] sm:bottom-auto sm:h-px sm:w-auto sm:border-l-0 sm:border-t-2"
              />
              {route.map((stop, i) => (
                <li
                  key={stop.city}
                  className={`relative flex items-center gap-5 sm:flex-col sm:gap-4 ${
                    // The last stop sits flush right so the road ends on its dot.
                    i === route.length - 1 && route.length > 1 ? 'sm:items-end sm:text-right' : 'sm:items-start'
                  }`}
                >
                  <span aria-hidden className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink">
                    <span className="h-2 w-2 rounded-full bg-sand" />
                  </span>
                  <span>
                    <span className="block text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-tight">{stop.city}</span>
                    <span className="eyebrow mt-1 block text-ink-mute">{stop.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-16 rounded-[1.75rem] bg-ink p-8 text-white lg:p-12">
              <p className="font-serif text-[clamp(1.5rem,3vw,2.25rem)] italic leading-snug">
                We’ll add stops along the way.
              </p>
              <p className="mt-4 max-w-xl text-sm text-white/65">
                If you want the Roadshow to stop in your city, tell us. To hear when we’re nearby,
                join the mailing list.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/community/partner" variant="solid-light" arrow>
                  Bring It to Your City
                </Button>
                <Button href="/community/community" variant="outline-light" arrow>
                  Catch Us Live
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
