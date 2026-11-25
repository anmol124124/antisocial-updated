import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { assetUrl } from '@/lib/directus';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { RegistrationForm } from '@/components/chapters/RegistrationForm';
import { EventPeople } from '@/components/chapters/EventPeople';
import { eventProfiles, eventSlug, getEventBySlug, getEvents } from '@/lib/content';
import { TBA, eventPeople, eventPlace, eventWhen, formatPrice, statement, statusOf, textLines, ticketPrice } from '@/lib/chapters';

export const revalidate = 60;

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: eventSlug(e) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Event not found' };
  const description = metaDescription(event.blurb || event.description, `${event.title}. Details and registration for this AntiSocialTalks event.`);
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${slug}` },
    // A shared link shows the event's poster (JPEG: some apps don't show WebP previews).
    ...(event.image
      ? {
          openGraph: {
            type: 'website',
            title: event.title,
            description,
            url: `/events/${slug}`,
            images: [{ url: `/api/assets/${event.image}?width=1200&height=1200&fit=cover&format=jpg&quality=85`, width: 1200, height: 1200, alt: `${event.title} poster` }],
          },
        }
      : {}),
  };
}

/** One row of the event details table. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-ink/10 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="text-sm font-semibold leading-relaxed text-ink">{children}</dd>
    </div>
  );
}

/**
 * One event: the title, its theme and the key facts up top (with the poster,
 * when there is one), then what it is about, the statement it stands for, what
 * makes it different, the people behind it, the details, and how to attend.
 * Every part comes from the CMS and is left out when empty; the date, time and
 * venue read "To Be Announced" until they are set. An invite-only event has no
 * public form, only a way to write to the team.
 */
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const status = statusOf(event.status);
  const when = eventWhen(event);
  const speakers = textLines(event.speakers);
  const schedule = textLines(event.schedule);
  const topics = textLines(event.topics);
  const quote = statement(event.pull_quote);
  const room = textLines(event.in_the_room);
  const closing = statement(event.closing) ?? { lines: ['Think differently.', 'Speak freely.', 'Change the world.'], caption: null };
  const teaser = event.teaser && (event.teaser.title || event.teaser.text) ? event.teaser : null;
  const people = eventPeople(event.people, await eventProfiles(event.people));
  const highlights = Array.isArray(event.highlights) ? event.highlights.filter((h) => h && h.title) : [];
  const price = ticketPrice(event);
  const poster = assetUrl(event.image, { width: 1000, height: 1000 });
  const privateEvent = status.mode === 'private';
  // Details still being shaped: no programme, no form and no venue yet.
  const soon = status.mode === 'soon';
  // Over (by its status or its date): no form, no secret guest, only the way to hear about the next one.
  const past = event.status === 'completed';
  const venue = soon ? null : event.venue_name;
  const contact = event.contact_email || 'admin@antisocialtalks.com';
  // A blank line in the CMS starts a new paragraph; with more than one, the first is the lead, set large.
  const paragraphs = (event.description || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const lead = paragraphs.length > 1 ? paragraphs[0] : null;
  const body = lead ? paragraphs.slice(1) : paragraphs;
  const place = eventPlace(event);
  const pill = 'inline-flex items-center rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em]';
  const heading = event.headline || event.title;
  const cta = event.cta_label || status.cta;

  // The key facts under the title. A date whose time is still to be announced shows no time cell.
  const facts: [string, string][] = [
    ['Date', when?.date || TBA],
    ...(when && !when.time ? [] : [['Time', when?.time || TBA] as [string, string]]),
    ['City', place || TBA],
    ['Venue', venue || TBA],
    ...(event.experience ? [['Experience', event.experience] as [string, string]] : []),
  ];

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-[30rem] w-[30rem] rounded-full opacity-[0.14] blur-[110px]"
          style={{ background: 'radial-gradient(circle, #c8a67f 0%, transparent 70%)' }}
        />
        <Container className="relative z-10 py-14 lg:py-20">
          <Link
            href="/events#events"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All events
          </Link>

          {/* With a poster: the text on the left, the poster whole on the right (under the text on phones). */}
          <div className={poster ? 'grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14' : undefined}>
            <Reveal>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {event.presented_by && <span className={`${pill} bg-white text-ink`}>{event.presented_by}</span>}
                {event.format && <span className={`${pill} bg-white text-ink`}>{event.format}</span>}
                {privateEvent && <span className={`${pill} bg-sand text-ink`}>Private Event</span>}
                <span className={`${pill} border border-white/25 text-white/85`}>{status.label}</span>
              </div>
              <Eyebrow tone="light">{event.kicker || ['AntiSocial Events', event.region || event.city].filter(Boolean).join(' · ')}</Eyebrow>
              <h1
                className={`display max-w-3xl ${heading.length <= 10 ? 'text-[clamp(4rem,15vw,9.5rem)] uppercase leading-[0.85]' : 'text-[clamp(2.25rem,6vw,4.25rem)]'}`}
              >
                {heading}
              </h1>
              {event.theme && <p className="mt-4 font-serif text-[clamp(1.375rem,2.6vw,1.875rem)] italic leading-snug text-sand">{event.theme}</p>}
              {event.blurb && !paragraphs.length && <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-white/70">{event.blurb}</p>}

              {status.notice && (
                <p role="status" className="mt-8 max-w-2xl rounded-2xl border border-sand/40 bg-sand/10 px-5 py-4 text-sm text-white">
                  {status.notice}
                </p>
              )}
            </Reveal>
            {poster && (
              <Reveal delay={100}>
                <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/40 ring-1 ring-white/10">
                  <Image src={poster} alt={`${event.title} poster`} fill priority sizes="(max-width: 1024px) 90vw, 450px" className="object-cover" />
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={120}>
            <dl
              className={`mt-12 grid gap-px overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/10 sm:grid-cols-2 ${
                facts.length === 5 ? 'lg:grid-cols-5' : facts.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
              }`}
            >
              {facts.map(([label, value]) => (
                <div key={label} className="bg-ink px-5 py-4">
                  <dt className="eyebrow text-[0.625rem] text-white/50">{label}</dt>
                  <dd className="mt-1.5 text-[0.9375rem] font-semibold leading-snug">{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </Container>
      </section>

      <section className="bg-cream py-14 lg:py-20">
        <Container>
          {paragraphs.length > 0 && (
            <Reveal>
              <div className="grid items-start gap-2 lg:grid-cols-[0.32fr_0.68fr] lg:gap-12">
                <Eyebrow>About the Event</Eyebrow>
                <div className="max-w-3xl">
                  {lead && <p className="display text-[clamp(1.625rem,3.2vw,2.5rem)]">{lead}</p>}
                  {body.map((p, i) => (
                    <p key={i} className={`text-[0.9375rem] leading-relaxed text-ink-mute ${lead || i ? 'mt-5' : ''}`}>
                      {p}
                    </p>
                  ))}
                  {topics && (
                    <ul className="mt-7 flex flex-wrap gap-2" aria-label="Topics">
                      {topics.map((t) => (
                        <li key={t} className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-xs font-semibold text-ink">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Reveal>
          )}

          {quote && (
            <Reveal>
              <blockquote className="grain relative isolate mt-14 overflow-hidden rounded-[1.75rem] bg-ink px-8 py-12 text-white sm:px-12 lg:py-16">
                <p className="display relative z-10 text-[clamp(1.75rem,4.2vw,3.25rem)]">
                  {quote.lines.map((line, i) => (
                    <span key={i} className={`block ${i === quote.lines.length - 1 && quote.lines.length > 1 ? 'font-serif font-normal italic text-sand' : ''}`}>
                      {line}
                    </span>
                  ))}
                </p>
                {quote.caption && <p className="relative z-10 mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-white/65">{quote.caption}</p>}
              </blockquote>
            </Reveal>
          )}

          {highlights.length > 0 && (
            <ul className={`mt-8 grid gap-6 ${highlights.length > 1 ? 'md:grid-cols-2' : ''} ${highlights.length > 2 ? 'lg:grid-cols-3' : ''}`}>
              {highlights.map((h, i) => (
                <li key={h.title}>
                  <Reveal delay={i * 60} className="h-full">
                    <div className="h-full rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                      {h.label && <p className="eyebrow text-sand-deep">{h.label}</p>}
                      <h2 className="mt-3 text-[clamp(1.25rem,2.2vw,1.625rem)] font-bold leading-tight tracking-tight">{h.title}</h2>
                      {h.text && <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">{h.text}</p>}
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}

          {room && (
            <div className="mt-14">
              <Reveal>
                <Eyebrow>What’s in the Room</Eyebrow>
              </Reveal>
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {room.map((item, i) => {
                  const last = i === room.length - 1 && room.length > 2;
                  return (
                    <li key={item} className={last && room.length % 4 !== 0 ? 'sm:col-span-2' : undefined}>
                      <Reveal delay={(i % 4) * 50} className="h-full">
                        <div
                          className={`flex h-full min-h-[8.5rem] flex-col justify-between rounded-[1.5rem] p-6 ${
                            last ? 'bg-ink text-white' : 'bg-white shadow-sm ring-1 ring-ink/[0.06]'
                          }`}
                        >
                          <span className={`font-serif text-lg italic ${last ? 'text-sand' : 'text-sand-deep'}`}>{String(i + 1).padStart(2, '0')}</span>
                          <span className={`mt-6 font-bold leading-tight tracking-tight ${last ? 'text-[clamp(1.25rem,2.2vw,1.625rem)]' : 'text-lg'}`}>{item}</span>
                        </div>
                      </Reveal>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {teaser && status.mode !== 'closed' && (
            <Reveal>
              <div className="mt-14 grid items-center gap-8 rounded-[1.75rem] bg-white p-8 shadow-sm ring-1 ring-ink/[0.06] sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
                <div>
                  {teaser.label && <p className="eyebrow text-sand-deep">{teaser.label}</p>}
                  {teaser.title && <h2 className="display mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)]">{teaser.title}</h2>}
                  {teaser.text && <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-mute">{teaser.text}</p>}
                </div>
                {/* Redacted: the name is not out yet. */}
                <div aria-hidden className="space-y-3">
                  <span className="block h-7 w-11/12 rounded-md bg-ink" />
                  <span className="block h-7 w-2/3 rounded-md bg-ink" />
                  <span className="block h-7 w-3/4 rounded-md bg-sand" />
                </div>
              </div>
            </Reveal>
          )}

          {!soon && (schedule || speakers) && (
            <div className={`mt-8 grid gap-6 ${schedule && speakers ? 'md:grid-cols-2' : ''}`}>
              {schedule && (
                <Reveal className="h-full">
                  <div className="h-full rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                    <p className="eyebrow text-sand-deep">Programme</p>
                    <ul className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink">
                      {schedule.map((s) => (
                        <li key={s} className="border-b border-ink/10 pb-3 last:border-b-0 last:pb-0">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
              {speakers && (
                <Reveal className="h-full">
                  <div className="h-full rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                    <p className="eyebrow text-sand-deep">Speakers</p>
                    <ul className="mt-4 space-y-2 text-[0.9375rem] font-semibold text-ink">
                      {speakers.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    {event.moderator && <p className="mt-4 text-sm text-ink-mute">Moderated by {event.moderator}</p>}
                  </div>
                </Reveal>
              )}
            </div>
          )}

          <EventPeople people={people} />
        </Container>
      </section>

      <section className="bg-cream-deep py-14 lg:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
            <Reveal>
              <div className="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                <p className="eyebrow text-sand-deep">Event Details</p>
                <dl className="mt-4 border-t border-ink/10">
                  <Row label="Event">{event.format ? `${event.title}, ${event.format.toLowerCase()}` : event.title}</Row>
                  {event.presented_by && <Row label="Presented by">{event.presented_by}</Row>}
                  <Row label="Date">{when?.date || TBA}</Row>
                  <Row label="Time">{when ? (when.time ? `${when.time} (local time)` : 'Time to be announced') : TBA}</Row>
                  <Row label="City">{place || TBA}</Row>
                  <Row label="Venue">
                    {venue || TBA}
                    {venue && event.venue_address && <span className="block font-normal text-ink-mute">{event.venue_address}</span>}
                    {venue && event.map_url && (
                      <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="link-underline mt-1 inline-block">
                        Open in Maps
                      </a>
                    )}
                  </Row>
                  {event.experience && <Row label="Experience">{event.experience}</Row>}
                  {event.audience && <Row label="Who it’s for">{event.audience}</Row>}
                  {privateEvent && <Row label="Entry">Private, invite only</Row>}
                  {price && (
                    <Row label="Tickets">
                      {formatPrice(price)} per person
                      {event.ticket_info && <span className="block font-normal text-ink-mute">{event.ticket_info}</span>}
                    </Row>
                  )}
                  {event.accessibility_info && <Row label="Accessibility">{event.accessibility_info}</Row>}
                  {event.terms && <Row label="Cancellation">{event.terms}</Row>}
                  <Row label="Contact">
                    <a href={`mailto:${contact}`} className="link-underline">
                      {contact}
                    </a>
                  </Row>
                  {event.recording_url && (
                    <Row label="Recording">
                      <a href={event.recording_url} target="_blank" rel="noopener noreferrer" className="link-underline">
                        Watch the conversation
                      </a>
                    </Row>
                  )}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={100} className="h-full">
              {/* Links point at this plain wrapper: Next.js won't scroll to a sticky element. */}
              <div id="register" className="h-full scroll-mt-24">
                <div className="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:sticky lg:top-28 lg:p-9">
                  {privateEvent ? (
                    <>
                      <Eyebrow>How to Attend</Eyebrow>
                      <h2 className="text-2xl font-bold tracking-tight">This is a private event.</h2>
                      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-mute">
                        {event.ticket_info || 'Invitations and RSVP links are sent personally by email to invited guests.'}
                      </p>
                      <p className="mt-6 text-sm text-ink">Not invited yet, but you should be in the room?</p>
                      <div className="mt-4">
                        <Button href={`mailto:${contact}?subject=${encodeURIComponent(event.title)}`} variant="solid-dark" arrow>
                          Write to Us
                        </Button>
                      </div>
                    </>
                  ) : past ? (
                    <>
                      <Eyebrow>Missed It?</Eyebrow>
                      <h2 className="text-2xl font-bold tracking-tight">There will be a next one.</h2>
                      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-mute">
                        Join the community and you will hear first about the next AntiSocial event, and who is in the room.
                      </p>
                      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                        <Button href="/community/community" variant="solid-dark" arrow>
                          Join the Community
                        </Button>
                        <Link href="/events" className="link-underline text-xs font-bold uppercase tracking-[0.16em] text-ink">
                          Upcoming Events
                        </Link>
                      </div>
                    </>
                  ) : soon ? (
                    <>
                      <Eyebrow>Details Coming Soon</Eyebrow>
                      <h2 className="text-2xl font-bold tracking-tight">We are still shaping this one.</h2>
                      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-mute">
                        Registration opens once the details are set. Join the community and you will hear first.
                      </p>
                      <div className="mt-6">
                        <Button href="/community/community" variant="solid-dark" arrow>
                          Join the Community
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Eyebrow>{status.formTitle || (status.mode === 'waitlist' ? 'Waitlist' : status.mode === 'rsvp' ? 'RSVP' : 'Register')}</Eyebrow>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {status.mode === 'closed'
                          ? 'Registration is closed.'
                          : cta
                            ? cta
                            : status.mode === 'waitlist'
                              ? 'Join the Waitlist'
                              : status.mode === 'rsvp'
                                ? 'RSVP for the Event'
                                : 'Register for the Event'}
                      </h2>
                      {/* The event's own words on what happens next; then the form. */}
                      {status.mode !== 'closed' && event.ticket_info && !price && (
                        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">{event.ticket_info}</p>
                      )}
                      <div className="mt-6" />
                      {status.mode === 'closed' || status.mode === 'private' || status.mode === 'soon' ? (
                        <p className="text-sm leading-relaxed text-ink-mute">
                          {status.notice} Want to hear about the next one?{' '}
                          <Link href="/community/community" className="link-underline font-semibold text-ink">
                            Join the community
                          </Link>
                          .
                        </p>
                      ) : (
                        <RegistrationForm
                          eventSlug={slug}
                          mode={status.mode}
                          price={price}
                          // The event's own words replace the status's note; the RSVP terms always stay.
                          note={event.ticket_info ? (status.mode === 'rsvp' ? undefined : '') : status.formNote}
                          submitLabel={cta}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="grain relative isolate overflow-hidden bg-ink py-20 text-center text-white lg:py-28">
        <Container className="relative z-10">
          <Reveal>
            <p className="display text-[clamp(2.25rem,6vw,4.5rem)]">
              {closing.lines.map((line, i) => (
                <span key={i} className={`block ${i === closing.lines.length - 1 && closing.lines.length > 1 ? 'font-serif font-normal italic text-sand' : ''}`}>
                  {line}
                </span>
              ))}
            </p>
            <div className="mt-10">
              <Button href="/events" variant="outline-light" arrow>
                All Events
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
