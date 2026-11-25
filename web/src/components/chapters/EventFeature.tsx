import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { assetUrl } from '@/lib/directus';
import { eventSlug, type ChapterEvent } from '@/lib/content';
import { TBA, eventPeople, eventWhen, formatPrice, statusOf, textLines, ticketPrice, type Profile } from '@/lib/chapters';
import { contactEmailFor } from '@/lib/site-content';

/** The button on an event's card, by what the visitor can do. */
function ctaLabel(status: ReturnType<typeof statusOf>): string {
  if (status.cta) return status.cta;
  switch (status.mode) {
    case 'rsvp':
      return 'RSVP for the Event';
    case 'waitlist':
      return 'Join the Waitlist';
    case 'booking':
      return 'Register for the Event';
    default:
      return 'Register Your Interest';
  }
}

/**
 * One event on /events, as a wide card: its poster (or the date set large)
 * beside the details. Every part comes from the CMS and is left out when
 * empty: the people behind it, the venue and time, what guests get, a guest
 * kept secret for now. A `featured` event gets the dark card. Nothing not
 * confirmed is guessed; a missing venue reads "To Be Announced". An event
 * whose details are still being shaped shows only that, and the way to hear
 * first. One that is over, postponed or cancelled says so instead of what
 * guests get.
 */
export async function EventFeature({
  event,
  profiles,
  priority = false,
}: {
  event: ChapterEvent;
  profiles?: { voices?: Profile[]; hosts?: Profile[] };
  priority?: boolean;
}) {
  const slug = eventSlug(event);
  const status = statusOf(event.status);
  const when = eventWhen(event);
  const price = ticketPrice(event);
  const people = eventPeople(event.people, profiles);
  const includes = textLines(event.includes);
  const teaser = event.teaser && (event.teaser.label || event.teaser.title || event.teaser.text) ? event.teaser : null;
  const poster = assetUrl(event.image, { width: 1000, height: 1000, fit: 'contain' });
  const dark = Boolean(event.featured);
  const contact = await contactEmailFor(event);
  const privateEvent = status.mode === 'private';
  const soon = status.mode === 'soon';
  // Postponed, cancelled or over: what guests will get, and how to get in, no longer apply.
  const closed = status.mode === 'closed';
  const place = event.city || event.region || 'AntiSocial Events';

  const tone = {
    card: dark ? 'bg-ink text-white' : 'bg-white text-ink shadow-sm ring-1 ring-ink/[0.06]',
    mute: dark ? 'text-white/65' : 'text-ink-mute',
    line: dark ? 'border-white/10' : 'border-ink/10',
    accent: dark ? 'text-sand' : 'text-sand-deep',
    box: dark ? 'bg-white/[0.06] ring-1 ring-white/10' : 'bg-cream ring-1 ring-ink/[0.06]',
  };
  const pill = 'inline-flex items-center rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em]';

  return (
    <article id={slug} className={`scroll-mt-28 grid overflow-hidden rounded-[1.75rem] lg:grid-cols-[0.85fr_1.15fr] ${tone.card}`}>
      {/* Left: the poster, whole, on a blurred copy of itself; or the date set large. */}
      <div className="relative min-h-[20rem] overflow-hidden bg-ink text-white">
        {poster ? (
          <div className="relative aspect-square h-full w-full lg:aspect-auto">
            <Image src={poster} alt="" aria-hidden fill sizes="(max-width: 1024px) 100vw, 45vw" className="scale-125 object-cover opacity-60 blur-2xl" />
            <Image
              src={poster}
              alt={`${event.title} poster`}
              fill
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="grain relative flex h-full min-h-[20rem] flex-col justify-between p-8 sm:p-10">
            <p className="eyebrow text-sand">{when ? `${when.weekday} · ${when.year}` : 'Date to be announced'}</p>
            <div>
              {when && (
                <p className="text-[clamp(4rem,11vw,7.5rem)] font-extrabold leading-[0.85] tracking-[-0.05em] tabular-nums">
                  {when.day}
                  <span className="text-sand">.</span>
                  {when.month}
                </p>
              )}
              <p className="mt-3 font-serif text-[clamp(2.25rem,6vw,3.5rem)] italic leading-none text-sand">{place}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: the details. */}
      <div className="flex flex-col p-7 sm:p-9 lg:p-11">
        <div className="flex flex-wrap items-center gap-2">
          {event.presented_by && <span className={`${pill} border ${dark ? 'border-white/30' : 'border-ink/25'}`}>{event.presented_by}</span>}
          {event.format && <span className={`${pill} border ${dark ? 'border-white/30' : 'border-ink/25'}`}>{event.format}</span>}
          {privateEvent && <span className={`${pill} bg-sand text-ink`}>Private Event</span>}
          <span className={`${pill} ${privateEvent ? `border ${dark ? 'border-white/30' : 'border-ink/25'}` : dark ? 'bg-sand text-ink' : 'bg-ink text-white'}`}>
            {status.mode !== 'closed' && !privateEvent && !soon && <span aria-hidden className={`mr-1.5 h-1.5 w-1.5 animate-pulse-dot rounded-full ${dark ? 'bg-ink' : 'bg-sand'}`} />}
            {status.label}
          </span>
        </div>

        <p className={`eyebrow mt-6 ${tone.mute}`}>{[place, when ? `${when.day} ${when.monthName} ${when.year}` : null].filter(Boolean).join(' · ')}</p>
        <h2 className="display mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)]">{event.title}</h2>
        {event.theme && <p className={`mt-3 font-serif text-[1.25rem] italic leading-snug ${tone.accent}`}>{event.theme}</p>}
        {event.blurb && <p className={`mt-4 max-w-xl text-[0.9375rem] leading-relaxed ${tone.mute}`}>{event.blurb}</p>}

        {soon && (
          <div className={`mt-7 rounded-2xl p-6 ${tone.box}`}>
            <p className={`eyebrow text-[0.625rem] ${tone.accent}`}>Details coming soon</p>
            <p className="mt-2 text-[0.9375rem] font-semibold leading-relaxed">{status.notice}</p>
          </div>
        )}

        {closed && status.notice && (
          <p className={`mt-7 rounded-2xl px-5 py-4 text-[0.9375rem] font-semibold leading-relaxed ${tone.box}`}>{status.notice}</p>
        )}

        {!soon && (
          <dl className={`mt-7 border-t ${tone.line} text-sm`}>
            {people.map((p) => (
              <div key={`${p.credit}-${p.name}`} className={`flex gap-4 border-b ${tone.line} py-3`}>
                <dt className={`eyebrow w-36 shrink-0 pt-0.5 text-[0.625rem] ${tone.mute}`}>{p.credit}</dt>
                <dd className="font-semibold">{p.name}</dd>
              </div>
            ))}
            {when && (
              <div className={`flex gap-4 border-b ${tone.line} py-3`}>
                <dt className={`eyebrow w-36 shrink-0 pt-0.5 text-[0.625rem] ${tone.mute}`}>When</dt>
                <dd className="font-semibold">
                  {when.date}
                  {when.time && <span className={`font-normal ${tone.mute}`}> · {when.time}</span>}
                </dd>
              </div>
            )}
            <div className={`flex gap-4 border-b ${tone.line} py-3`}>
              <dt className={`eyebrow w-36 shrink-0 pt-0.5 text-[0.625rem] ${tone.mute}`}>Venue</dt>
              <dd className="font-semibold">{event.venue_name || TBA}</dd>
            </div>
            {price && (
              <div className={`flex gap-4 border-b ${tone.line} py-3`}>
                <dt className={`eyebrow w-36 shrink-0 pt-0.5 text-[0.625rem] ${tone.mute}`}>Tickets</dt>
                <dd className="font-semibold">{formatPrice(price)} per person</dd>
              </div>
            )}
          </dl>
        )}

        {!soon && !closed && event.perk && (
          <p className={`mt-6 flex items-start gap-3 rounded-2xl px-5 py-4 text-sm font-medium ${tone.box}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${tone.accent}`}>
              <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" strokeLinejoin="round" />
            </svg>
            {event.perk}
          </p>
        )}

        {!soon && !closed && (teaser || includes) && (
          <div className={`mt-6 grid gap-4 ${teaser && includes ? 'sm:grid-cols-2' : ''}`}>
            {teaser && (
              <div className={`rounded-2xl p-5 ${tone.box}`}>
                {teaser.label && <p className={`eyebrow text-[0.625rem] ${tone.mute}`}>{teaser.label}</p>}
                {teaser.title && <p className="mt-2 text-sm font-bold leading-snug">{teaser.title}</p>}
                <span aria-hidden className={`mt-4 block h-4 w-4/5 rounded ${dark ? 'bg-white/80' : 'bg-ink/80'}`} />
                <span aria-hidden className={`mt-2 block h-4 w-1/2 rounded ${dark ? 'bg-white/80' : 'bg-ink/80'}`} />
                {teaser.text && <p className={`mt-4 text-sm ${tone.mute}`}>{teaser.text}</p>}
              </div>
            )}
            {includes && (
              <div className={`rounded-2xl p-5 ${tone.box}`}>
                <p className={`eyebrow text-[0.625rem] ${tone.mute}`}>What you get</p>
                <ul className="mt-3 space-y-2.5 text-sm font-medium">
                  {includes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${tone.accent}`}>
                        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            {privateEvent ? (
              <Button href={`mailto:${contact}?subject=${encodeURIComponent(event.title)}`} variant={dark ? 'solid-light' : 'solid-dark'} arrow>
                Think You Belong in the Room? Write to Us
              </Button>
            ) : soon ? (
              <Button href="/community/community" variant={dark ? 'sand' : 'solid-dark'} arrow>
                Join the Community
              </Button>
            ) : status.mode !== 'closed' ? (
              <Button href={`/events/${slug}#register`} variant={dark ? 'sand' : 'solid-dark'} arrow>
                {event.cta_label || ctaLabel(status)}
              </Button>
            ) : null}
            <Link href={`/events/${slug}`} className={`link-underline text-xs font-bold uppercase tracking-[0.16em] ${dark ? 'text-white' : 'text-ink'}`}>
              See Full Event Details
            </Link>
          </div>
          {!soon && !closed && event.ticket_info && <p className={`mt-4 max-w-lg text-sm leading-relaxed ${tone.mute}`}>{event.ticket_info}</p>}
        </div>
      </div>
    </article>
  );
}
