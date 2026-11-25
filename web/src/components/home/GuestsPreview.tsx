import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Media, initials } from '@/components/ui/Media';
import { assetUrl } from '@/lib/directus';
import { slugify, type Guest } from '@/lib/content';

// Tiles keep their size: three across, or four/five across when there are that many.
const COLS: Record<number, string> = { 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' };

/**
 * 04 / Meet the Voices (homepage brief): black. The guests the team puts on
 * the home page (Guests → Home position), with their portrait, name, title and
 * quote. Portraits are black and white with the brand's red bar; colour
 * returns on hover. Phones get a swipeable rail.
 */
export function GuestsPreview({ guests }: { guests: Guest[] }) {
  const shown = guests.slice(0, 5);
  return (
    <section aria-labelledby="guests-title" className="border-t border-white/10 bg-ink py-20 text-white lg:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
          <Reveal>
            <p className="kicker mb-6 text-white/55">Meet the Voices</p>
            <h2 id="guests-title" className="headline text-[clamp(2.25rem,5vw,3.75rem)]">
              They’ve been interviewed before. <span className="text-signal">Not like this.</span>
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-md text-[1rem] leading-relaxed text-white/65">
              From founders and scientists to artists and athletes, we bring together people from different
              backgrounds to challenge perspectives and explore the stories behind the headlines.
            </p>
            <div className="mt-7">
              <Button href="/voices" variant="outline-light" arrow>
                Meet the Voices
              </Button>
            </div>
          </Reveal>
        </div>

        {shown.length > 0 && (
          <Reveal delay={120}>
            <ul
              className={`no-scrollbar -mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:gap-5 sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:mt-16 ${COLS[shown.length] ?? ''}`}
            >
              {shown.map((guest, i) => (
                <li key={guest.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
                  <VoiceTile guest={guest} tone={i} />
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </Container>
    </section>
  );
}

function VoiceTile({ guest, tone }: { guest: Guest; tone: number }) {
  const href = `/voices/${slugify(guest.name)}`;
  return (
    <article className="group">
      <Link href={href} className="block" aria-label={guest.name}>
        <div className="relative overflow-hidden rounded-xl">
          <Media
            src={assetUrl(guest.photo, { width: 720, height: 900 })}
            alt={`Portrait of ${guest.name}`}
            fallbackLabel={initials(guest.name)}
            tone={tone}
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 22vw"
            className="aspect-[4/5] w-full grayscale transition duration-700 group-hover:grayscale-0"
          />
          <span aria-hidden className="absolute bottom-4 left-4 h-7 w-[3px] bg-signal" />
        </div>
      </Link>
      <h3 className="mt-4 font-display text-[1.0625rem] font-bold leading-snug tracking-tight">
        <Link href={href} className="link-underline">
          {guest.name}
        </Link>
      </h3>
      {guest.designation && <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">{guest.designation}</p>}
      {guest.teaser && <p className="mt-3 text-[0.9375rem] leading-snug text-white/75">&ldquo;{guest.teaser}&rdquo;</p>}
    </article>
  );
}
