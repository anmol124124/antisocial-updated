import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { slugify, youtubeId, type Episode } from '@/lib/content';
import { EpisodePlayer } from '@/components/episodes/EpisodePlayer';
import type { Teaser } from '@/lib/site-content';
import { Countdown } from '@/components/episodes/Countdown';

/**
 * Leads with whatever Directus says the newest episode is. The whole
 * "Coming Soon" -> "Watch Episode" swap is driven by that row's `status`
 * field, so flipping it in the CMS is the only action needed at launch.
 *
 * A released episode gets "Watch Episode" (its YouTube video, or its page
 * when it has none) and "Subscribe on YouTube"; its title opens its page.
 *
 * Before launch there are two states, picked by the episode's publish_date:
 *   - a date in the future -> "Episode 01. Out 14 October." + a live countdown
 *   - no date (or one already past) -> the knock-knock
 */

/** "Abdu Rozik", "Reem Elkot and Alaa Sediik", "A, B and C". */
function listOf(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '';
}

/** The pre-launch copy, set as a two-voice exchange: statements bold, replies italic. */
function KnockKnock() {
  const lines: [string, 'call' | 'reply'][] = [
    ['Knock knock.', 'call'],
    ['Who’s there?', 'reply'],
    ['Your fav guests, your hot takes, your next obsession.', 'call'],
    ['Your next obsession who?', 'reply'],
    ['AntiSocialTalks Episode 01 coming soon.', 'call'],
  ];
  return (
    <div className="space-y-2">
      {lines.map(([text, kind]) => (
        <p
          key={text}
          className={
            kind === 'call'
              ? 'text-[clamp(1.125rem,1.8vw,1.375rem)] font-bold leading-snug tracking-tight text-ink'
              : 'pl-6 font-serif text-[clamp(1.125rem,1.8vw,1.375rem)] italic leading-snug text-sand-deep'
          }
        >
          {text}
        </p>
      ))}
    </div>
  );
}
export function FeaturedEpisode({
  episode,
  guests = [],
  youtube,
  teaser,
}: {
  episode: Episode | null;
  guests?: string[];
  /** The channel, for "Subscribe on YouTube" (Site settings). */
  youtube: string | null;
  /** The pre-launch clip (Home page), shown until the episode is published. */
  teaser: Teaser | null;
}) {
  if (!episode) {
    return (
      <section className="bg-cream py-20 lg:py-28">
        <Container>
          <Eyebrow>Episode 01</Eyebrow>
          <KnockKnock />
          <div className="mt-8">
            {youtube && (
              <Button href={youtube} external variant="outline-dark" arrow>
                Subscribe on YouTube
              </Button>
            )}
          </div>
        </Container>
      </section>
    );
  }

  const published = episode.status === 'published';
  const videoId = youtubeId(episode.youtube_url);
  const slug = slugify(episode.title);
  const released = episode.publish_date
    ? new Date(episode.publish_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;
  const countdownTo =
    !published && episode.publish_date && new Date(episode.publish_date).getTime() > Date.now()
      ? episode.publish_date
      : null;

  return (
    <section id="featured" aria-labelledby="featured-title" className="bg-cream py-20 lg:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Eyebrow>{published ? 'Latest Episode' : 'Episode 01'}</Eyebrow>
            {published ? (
              <>
                <h2 id="featured-title" className="display text-[clamp(2rem,4.5vw,3.25rem)]">
                  The conversations people{' '}
                  <span className="font-serif font-normal italic text-sand-deep">usually avoid.</span>
                </h2>
                <h3 className="mt-6 text-[clamp(1.25rem,2vw,1.5rem)] font-bold leading-snug tracking-tight">
                  <Link href={`/episodes/${slug}`} className="transition-colors hover:text-sand-deep">
                    {episode.title}
                  </Link>
                </h3>
                {(released || guests.length > 0) && (
                  <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-mute">
                    {released && <span>Released {released}</span>}
                    {released && guests.length > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-sand" />}
                    {guests.length > 0 && <span>With {listOf(guests)}</span>}
                  </p>
                )}
                {episode.description && (
                  <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-ink-mute">
                    {episode.description}
                  </p>
                )}
              </>
            ) : countdownTo ? (
              <>
                <h2 id="featured-title" className="display text-[clamp(2rem,4.5vw,3.25rem)]">
                  Episode 01.{' '}
                  <span className="font-serif font-normal italic text-sand-deep">
                    Out {new Date(countdownTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}.
                  </span>
                </h2>
                <div className="mt-8">
                  <Countdown target={countdownTo} />
                </div>
              </>
            ) : (
              // Before launch, never the CMS description — that's where the team
              // leaves itself working notes.
              <>
                <h2 id="featured-title" className="sr-only">
                  Episode 01 coming soon
                </h2>
                <KnockKnock />
              </>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {published ? (
                <>
                  {episode.youtube_url ? (
                    <Button href={episode.youtube_url} external variant="solid-dark" arrow>
                      Watch Episode
                    </Button>
                  ) : (
                    <Button href={`/episodes/${slug}`} variant="solid-dark" arrow>
                      Watch Episode
                    </Button>
                  )}
                  {youtube && (
                    <Button href={youtube} external variant="outline-dark">
                      Subscribe on YouTube
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex h-11 items-center gap-2.5 rounded-full border border-ink/15 px-6 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink-mute">
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sand" />
                    Up next
                  </span>
                  {youtube && (
                    <Button href={youtube} external variant="outline-dark" arrow>
                      Subscribe on YouTube
                    </Button>
                  )}
                </>
              )}
            </div>

            {episode.topics && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {episode.topics
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full border border-ink/12 bg-white px-3.5 py-1.5 text-xs font-medium text-ink-mute"
                    >
                      {topic}
                    </li>
                  ))}
              </ul>
            )}
          </Reveal>

          <Reveal delay={120}>
            <EpisodePlayer
              videoId={videoId}
              title={episode.title}
              posterSrc={teaser?.poster ?? undefined}
              previewSrc={published ? null : (teaser?.src ?? null)}
              captionsSrc={teaser?.captions ?? null}
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
