import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { assetUrl } from '@/lib/directus';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { RegistrationForm } from '@/components/chapters/RegistrationForm';
import { EventPeople } from '@/components/chapters/EventPeople';
import { eventProfiles, eventSlug, getEventByInviteCode } from '@/lib/content';
import { TBA, eventPeople, eventPlace, eventWhen, statement, statusOf, textLines } from '@/lib/chapters';

export const revalidate = 60;

// Private: never in search results, never in the sitemap, linked from nowhere on the site.
const PRIVATE = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByInviteCode(code);
  if (!event) return { title: 'Invitation not found', robots: PRIVATE };
  const title = `You’re Invited: ${event.title}`;
  const description = `A private invitation to ${event.title}. Accept it and your invitation, with the venue and the details, comes straight to your inbox.`;
  return {
    title,
    description,
    robots: PRIVATE,
    // The link is shared privately (WhatsApp, email), so it previews the poster.
    ...(event.image
      ? {
          openGraph: {
            type: 'website',
            title,
            description,
            images: [{ url: `/api/assets/${event.image}?width=1200&height=1200&fit=cover&format=jpg&quality=85`, width: 1200, height: 1200, alt: `${event.title} poster` }],
          },
        }
      : {}),
  };
}

/**
 * A private invitation page: /invite/<the event's invite_code>. The link is
 * the invitation. A guest fills in the form, goes straight on the guest list
 * (event_registrations, kind "invite") and is emailed their invitation with
 * the venue and a calendar entry. Shown only to people who have the link.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const event = await getEventByInviteCode(code);
  if (!event) notFound();

  const status = statusOf(event.status);
  const closed = status.mode === 'closed';
  // The event has happened: the link still opens, to say so and thank the guests.
  const past = event.status === 'completed';
  const when = eventWhen(event);
  const place = eventPlace(event);
  const topics = textLines(event.topics);
  const quote = statement(event.pull_quote);
  const closing = statement(event.closing) ?? { lines: ['Think differently.', 'Speak freely.', 'Change the world.'], caption: null };
  const people = eventPeople(event.people, await eventProfiles(event.people));
  const poster = assetUrl(event.image, { width: 1000, height: 1000 });
  const paragraphs = (event.description || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const contact = event.contact_email || 'admin@antisocialtalks.com';

  const facts: [string, string][] = [
    ['Date', when?.date || TBA],
    ...(when && !when.time ? [] : [['Time', when?.time || TBA] as [string, string]]),
    ['City', place || TBA],
    ['Venue', 'In your invitation email'],
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
          <div className={poster ? 'grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14' : undefined}>
            <Reveal>
              <span className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-ink">
                Private Invitation
              </span>
              <p className="mt-6 font-serif text-[clamp(1.5rem,3vw,2.25rem)] italic leading-none text-sand">{past ? 'You were invited to' : 'You’re invited to'}</p>
              <h1 className="display mt-3 max-w-3xl text-[clamp(2.25rem,6vw,4.25rem)]">{event.title}</h1>
              {event.theme && <p className="mt-4 font-serif text-[clamp(1.25rem,2.4vw,1.75rem)] italic leading-snug text-white/80">{event.theme}</p>}
              <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-white/70">
                {closed
                  ? status.notice
                  : 'This page is only for the people we have invited. Accept below and your invitation, with the venue and the details, comes straight to your inbox.'}
              </p>
              {!closed && (
                <div className="mt-8">
                  <Button href="#accept" variant="sand" arrow>
                    Accept Your Invitation
                  </Button>
                </div>
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
            <dl className={`mt-12 grid gap-px overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/10 sm:grid-cols-2 ${facts.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
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
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <Reveal>
              <Eyebrow>About the Event</Eyebrow>
              {paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? 'display text-[clamp(1.5rem,2.8vw,2.125rem)]' : 'mt-5 text-[0.9375rem] leading-relaxed text-ink-mute'}>
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
              {event.perk && !closed && (
                <p className="mt-8 flex items-start gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-medium shadow-sm ring-1 ring-ink/[0.06]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-sand-deep">
                    <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" strokeLinejoin="round" />
                  </svg>
                  {event.perk}
                </p>
              )}
              {quote && (
                <blockquote className="grain relative isolate mt-8 overflow-hidden rounded-[1.75rem] bg-ink px-7 py-9 text-white sm:px-9">
                  <p className="display relative z-10 text-[clamp(1.375rem,2.6vw,1.875rem)]">
                    {quote.lines.map((line, i) => (
                      <span key={i} className={`block ${i === quote.lines.length - 1 && quote.lines.length > 1 ? 'font-serif font-normal italic text-sand' : ''}`}>
                        {line}
                      </span>
                    ))}
                  </p>
                </blockquote>
              )}
            </Reveal>

            <Reveal delay={100}>
              {/* Not sticky: the hero button links here, and Next.js won't scroll to a sticky element. */}
              <div id="accept" className="scroll-mt-24 rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                {closed ? (
                  <>
                    <Eyebrow>Invitation</Eyebrow>
                    <h2 className="text-2xl font-bold tracking-tight">This invitation has closed.</h2>
                    <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-mute">
                      {past ? (
                        <>
                          Want to hear about the next one?{' '}
                          <Link href="/community/community" className="link-underline font-semibold text-ink">
                            Join the community
                          </Link>
                          .
                        </>
                      ) : (
                        status.notice
                      )}{' '}
                      Questions?{' '}
                      <a href={`mailto:${contact}`} className="link-underline font-semibold text-ink">
                        {contact}
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <Eyebrow>RSVP</Eyebrow>
                    <h2 className="text-2xl font-bold tracking-tight">Accept Your Invitation</h2>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">
                      Fill this in and your invitation arrives by email straight away, with the venue, the timings and a
                      calendar entry.
                    </p>
                    <div className="mt-6">
                      <RegistrationForm
                        eventSlug={eventSlug(event)}
                        mode="rsvp"
                        invite={code}
                        note=""
                        submitLabel="Accept Invitation"
                        doneTitle="You’re on the guest list."
                      />
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          </div>

          <EventPeople people={people} />
        </Container>
      </section>

      <section className="grain relative isolate overflow-hidden bg-ink py-20 text-center text-white lg:py-24">
        <Container className="relative z-10">
          <Reveal>
            <p className="display text-[clamp(2rem,5vw,3.75rem)]">
              {closing.lines.map((line, i) => (
                <span key={i} className={`block ${i === closing.lines.length - 1 && closing.lines.length > 1 ? 'font-serif font-normal italic text-sand' : ''}`}>
                  {line}
                </span>
              ))}
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
