import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventFeature } from '@/components/chapters/EventFeature';
import { Countdown } from '@/components/episodes/Countdown';
import { eventProfiles, eventSlug, getEvents } from '@/lib/content';
import { APPLICATIONS, eventWhen, statusOf } from '@/lib/chapters';
import { getChapterGuide } from '@/lib/site-content';

export const revalidate = 60;

/** "Dubai", "Dubai and Zurich", "Dubai, Zurich and San Francisco". */
function listOf(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] || '';
}

// The cities named are the ones with an event still to come, so a past event drops out by itself.
export async function generateMetadata(): Promise<Metadata> {
  const events = await getEvents();
  // A region stands in for a missing city, unless it is a programme name ("AntiSocialTalks Davos").
  const place = (e: (typeof events)[number]) => (e.city || (/antisocial/i.test(e.region || '') ? '' : e.region) || '').trim();
  const cities = [...new Set(events.filter((e) => statusOf(e.status).mode !== 'closed').map(place).filter(Boolean))];
  return {
    ...pageLinks('/events'),
    title: 'AntiSocial Events',
    description: cities.length
      ? `No small talk, only the real stuff. AntiSocialTalks live in ${listOf(cities)}, and on the India Roadshow.`
      : 'No small talk, only the real stuff. AntiSocialTalks live, city by city, and on the India Roadshow.',
  };
}

const NUMBERS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/**
 * AntiSocial Events: where people meet in person. Kept apart from AntiSocial
 * Chapters, which is the podcast city by city. Events come from the CMS: the
 * next dated one counts down at the top, every upcoming one has a row in the
 * schedule and a card below. The Roadshow has its own page and is linked here.
 * Events that have happened sit under Past Events at the end.
 */
export default async function EventsPage() {
  const [events, { organisingSteps }] = await Promise.all([getEvents(), getChapterGuide()]);
  // The voices and hosts any event's people point to, fetched once for every card.
  const profiles = await eventProfiles(events.flatMap((e) => (Array.isArray(e.people) ? e.people : [])));
  const upcoming = events.filter((e) => statusOf(e.status).mode !== 'closed');
  // Cards: everything still ahead (postponed and cancelled included, they are news), then the past.
  const current = events.filter((e) => e.status !== 'completed');
  const past = events.filter((e) => e.status === 'completed');
  const now = Date.now();
  const next = upcoming
    .filter((e) => e.starts_at && new Date(e.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())[0];
  const nextWhen = next ? eventWhen(next) : null;

  const years = [...new Set(upcoming.map((e) => eventWhen(e)?.year).filter(Boolean))].sort();
  const cities = new Set(upcoming.map((e) => (e.city || e.region || '').trim().toLowerCase()).filter(Boolean)).size;

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-[30rem] w-[30rem] rounded-full opacity-[0.14] blur-[110px]"
          style={{ background: 'radial-gradient(circle, #c8a67f 0%, transparent 70%)' }}
        />
        <Container className="relative z-10 py-16 lg:py-24">
          <Reveal>
            <Eyebrow tone="light">
              {years.length ? `Live Events · ${years.length > 1 ? `${years[0]} to ${years[years.length - 1]}` : years[0]}` : 'Live Events'}
            </Eyebrow>
            <h1 className="display max-w-4xl text-[clamp(2.25rem,6vw,4.5rem)]">
              No small talk.{' '}
              <span className="block font-serif font-normal italic text-sand">Only the real stuff.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-white/70">
              Rooms built for bolder conversations.{cities > 1 && NUMBERS[cities] ? ` ${NUMBERS[cities]} cities, one rule:` : ' One rule:'} skip the small talk and say what you actually think.
            </p>
          </Reveal>

          {next && nextWhen && (
            <Reveal delay={80}>
              <a
                href={`#${eventSlug(next)}`}
                className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-white/25 sm:p-7"
              >
                <div>
                  <p className="eyebrow text-white/50">Next Up</p>
                  <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                    {next.city || next.region} · {Number(nextWhen.day)} {nextWhen.monthName}
                  </p>
                </div>
                <Countdown target={next.starts_at!} variant="inline" />
              </a>
            </Reveal>
          )}

          {upcoming.length > 0 && (
            <Reveal delay={120}>
              <ul className="mt-8 border-t border-white/10" aria-label="Upcoming events">
                {upcoming.map((e) => {
                  const w = eventWhen(e);
                  const s = statusOf(e.status);
                  return (
                    <li key={e.id}>
                      <a
                        href={`#${eventSlug(e)}`}
                        className="grid grid-cols-[4.5rem_1fr] items-center gap-x-4 gap-y-1 border-b border-white/10 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[6rem_1fr_auto]"
                      >
                        <span className="font-bold tabular-nums tracking-tight">{w ? `${w.day} ${w.monthName}` : 'TBA'}</span>
                        <span className="font-bold uppercase tracking-tight">{e.city || e.region}</span>
                        <span className="eyebrow col-start-2 text-[0.625rem] text-sand sm:col-start-auto sm:text-right">
                          {s.mode === 'private' ? 'Private · Invite Only' : s.label}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          )}
        </Container>
      </section>

      <section id="events" className="scroll-mt-24 bg-cream py-16 lg:py-24">
        <Container>
          {current.length === 0 ? (
            <EmptyState title="No events announced yet." hint="Want to run one in your city?" />
          ) : (
            <ul className="grid gap-8">
              {current.map((event, i) => (
                <li key={event.id}>
                  <Reveal>
                    <EventFeature event={event} profiles={profiles} priority={i === 0} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}

          {/* The Roadshow: one more way to meet us. */}
          <Reveal>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-[1.75rem] bg-ink p-8 text-white sm:p-10">
              <div>
                <p className="eyebrow text-white/55">The Roadshow · India</p>
                <h2 className="mt-3 text-[clamp(1.375rem,2.4vw,1.75rem)] font-bold leading-tight tracking-tight">Chandigarh to Mumbai.</h2>
                <p className="mt-2 font-serif text-[1.0625rem] italic leading-snug text-sand">
                  AntiSocialTalks on the road, stopping in cities along the way.
                </p>
              </div>
              <Button href="/roadshow" variant="solid-light" arrow>
                See the Route
              </Button>
            </div>
          </Reveal>

          {past.length > 0 && (
            <div id="past" className="mt-20 scroll-mt-24 lg:mt-24">
              <Reveal>
                <Eyebrow>Past Events</Eyebrow>
                <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">
                  The Conversations{' '}
                  <span className="font-serif font-normal italic text-sand-deep">So Far.</span>
                </h2>
              </Reveal>
              <ul className="mt-10 grid gap-8">
                {past.map((event) => (
                  <li key={event.id}>
                    <Reveal>
                      <EventFeature event={event} profiles={profiles} />
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>
      </section>

      <section className="grain relative isolate overflow-hidden bg-ink py-16 text-white lg:py-24">
        <Container className="relative z-10">
          <Reveal>
            <Eyebrow tone="light">How Organising Works</Eyebrow>
            <h2 className="display max-w-2xl text-[clamp(1.75rem,3.4vw,2.5rem)]">
              From an Idea to a{' '}
              <span className="font-serif font-normal italic text-sand">City Conversation.</span>
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {organisingSteps.map((step, i) => (
              <li key={step.title} className="bg-ink p-7">
                <Reveal delay={i * 60}>
                  <span className="font-serif text-2xl italic text-sand/80">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-6 text-lg font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{step.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="organise" className="scroll-mt-24 bg-cream-deep py-16 lg:py-24">
        <Container>
          <Reveal>
            <div className="grid gap-10 rounded-[1.75rem] bg-white p-8 shadow-sm ring-1 ring-ink/[0.06] lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:p-12">
              <div>
                <Eyebrow>Organise an Event</Eyebrow>
                <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">
                  Bring the Conversation{' '}
                  <span className="font-serif font-normal italic text-sand-deep">to Your City.</span>
                </h2>
                <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-mute">
                  {APPLICATIONS.organiser.lede}
                </p>
                <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-mute">
                  We read every proposal and work with approved organisers on the programme, the venue and the
                  date.
                </p>
              </div>
              <div className="lg:justify-self-end">
                <Button href="/chapters/organise" variant="solid-dark" arrow>
                  Organise an Event
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-cream py-20 text-center lg:py-28">
        <Container>
          <Reveal>
            <h2 className="display text-[clamp(2.25rem,6vw,4.5rem)]">
              Not anti-society.
              <span className="block font-serif font-normal italic text-sand-deep">Anti-silence.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-[0.9375rem] leading-relaxed text-ink-mute">
              Join the AntiSocials to get event invites, early access and the first look at who is in the room.
            </p>
            <div className="mt-8">
              <Button href="/community" variant="solid-dark" arrow>
                Join the Community
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
