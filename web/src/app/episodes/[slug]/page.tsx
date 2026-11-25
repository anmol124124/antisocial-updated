import type { Metadata } from 'next';
import { metaDescription, pageLinks } from '@/lib/meta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EpisodePlayer } from '@/components/episodes/EpisodePlayer';
import { GuestCard } from '@/components/guests/GuestCard';
import { getHomePage, getSiteSettings, youtubeChannel } from '@/lib/site-content';
import {
  getEpisodeBySlug,
  getEpisodes,
  getGuests,
  slugify,
  youtubeId,
  type Episode,
} from '@/lib/content';

export const revalidate = 60;

export async function generateStaticParams() {
  const episodes = await getEpisodes(200);
  return episodes.map((e) => ({ slug: slugify(e.title) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) return { title: 'Episode not found' };
  const videoId = youtubeId(episode.youtube_url);
  return {
    title: episode.title,
    description: metaDescription(episode.description, `${episode.title}, an AntiSocialTalks episode.`),
    // A shared episode shows its YouTube thumbnail (hqdefault exists for every video; maxres does not).
    ...pageLinks(
      `/episodes/${slug}`,
      videoId ? { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360, alt: episode.title } : null,
    ),
  };
}

function hostOf(host: Episode['host']) {
  return host && typeof host === 'object' ? host : null;
}

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [episode, allGuests, home, settings] = await Promise.all([getEpisodeBySlug(slug), getGuests(200), getHomePage(), getSiteSettings()]);
  const youtube = youtubeChannel(settings);
  const teaser = home.teaser;

  if (!episode) notFound();

  const published = episode.status === 'published';
  const videoId = youtubeId(episode.youtube_url);
  const host = hostOf(episode.host);

  const guests = allGuests.filter(
    (g) => g.episode && typeof g.episode === 'object' && g.episode.id === episode.id,
  );

  const date = episode.publish_date
    ? new Date(episode.publish_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : null;

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <Container className="relative z-10 py-14 lg:py-20">
          <Link
            href="/episodes"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All episodes
          </Link>

          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <Reveal>
              <Eyebrow tone="light">{published ? 'Episode' : 'Coming Soon'}</Eyebrow>
              <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">{episode.title}</h1>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-[0.12em] text-white/50">
                {date && <span>{date}</span>}
                {guests.length > 0 && (
                  <>
                    {date && <span aria-hidden className="h-1 w-1 rounded-full bg-sand" />}
                    <span>With {guests.map((g) => g.name).join(' & ')}</span>
                  </>
                )}
                {host && (
                  <>
                    <span aria-hidden className="h-1 w-1 rounded-full bg-sand" />
                    <span>Hosted by {host.name}</span>
                  </>
                )}
              </div>

              {episode.description && (
                <p className="mt-7 max-w-lg text-[0.9375rem] leading-relaxed text-white/75">
                  {episode.description}
                </p>
              )}

              {episode.topics && (
                <ul className="mt-7 flex flex-wrap gap-2">
                  {episode.topics
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((topic) => (
                      <li key={topic}>
                        <Link
                          href={`/episodes?topic=${slugify(topic)}`}
                          className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/50 hover:text-white"
                        >
                          {topic}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}

              <div className="mt-9 flex flex-wrap gap-3">
                {published && (episode.youtube_url || episode.spotify_url) ? (
                  <>
                    {episode.youtube_url && (
                      <Button href={episode.youtube_url} external variant="solid-light" arrow>
                        Watch on YouTube
                      </Button>
                    )}
                    {episode.spotify_url && (
                      <Button href={episode.spotify_url} external variant="outline-light">
                        Listen on Spotify
                      </Button>
                    )}
                  </>
                ) : youtube ? (
                  <Button href={youtube} external variant="solid-light" arrow>
                    Subscribe for the drop
                  </Button>
                ) : null}
                <Button href="/community/question" variant="outline-light" arrow>
                  Submit a Question
                </Button>
              </div>
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

      {guests.length > 0 && (
        <section className="bg-cream py-20 lg:py-24">
          <Container>
            <Reveal>
              <Eyebrow>In this episode</Eyebrow>
              <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">The voices.</h2>
            </Reveal>
            <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {guests.map((guest, i) => (
                <li key={guest.id}>
                  <Reveal delay={i * 60}>
                    <GuestCard guest={guest} tone={i} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
