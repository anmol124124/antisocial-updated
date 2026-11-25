import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import Link from 'next/link';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Reveal } from '@/components/ui/Reveal';
import { EpisodeCard } from '@/components/episodes/EpisodeCard';
import { getSiteSettings, youtubeChannel } from '@/lib/site-content';
import { getEpisodes, getGuests, getTopics, guestsOf, slugify, topicSlugsOf } from '@/lib/content';

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageLinks('/episodes'),
  title: 'Episodes',
  description:
    'Every AntiSocialTalks conversation. Browse by topic, host or voice. Published on YouTube first.',
};

export default async function EpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic: topicFilter } = await searchParams;
  const [episodes, allTopics, voices, settings] = await Promise.all([getEpisodes(), getTopics(), getGuests(200), getSiteSettings()]);
  const youtube = youtubeChannel(settings);
  // Only topics with at least one episode get a filter: none leads to an empty list.
  const used = topicSlugsOf(episodes);
  const topics = allTopics.filter((t) => used.has(t.slug || slugify(t.title)));

  // `topics` on an episode is a free-text, comma-separated field in Directus,
  // so the filter matches on the slugified form of each entry.
  const filtered = topicFilter
    ? episodes.filter((e) =>
        (e.topics || '')
          .split(',')
          .map((t) => slugify(t.trim()))
          .includes(topicFilter),
      )
    : episodes;

  const activeTopic = allTopics.find((t) => (t.slug || slugify(t.title)) === topicFilter);

  return (
    <>
      <PageHero
        eyebrow="Episodes"
        title="Every conversation,"
        accent="start to finish."
        lede="Every episode goes up on YouTube first. Subscribe there and you will get each one the day it comes out."
      >
        {youtube && (
          <Button href={youtube} external variant="solid-light" arrow>
            Subscribe on YouTube
          </Button>
        )}
      </PageHero>

      <section className="bg-cream py-14 lg:py-20">
        <Container>
          {topics.length > 0 && (
            <nav aria-label="Filter by topic" className="mb-10 flex flex-wrap gap-2">
              <Link
                href="/episodes"
                data-active={!topicFilter}
                className="rounded-full border border-ink/12 bg-white px-4 py-2 text-xs font-semibold transition data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-white"
              >
                All
              </Link>
              {topics.map((topic) => {
                const slug = topic.slug || slugify(topic.title);
                return (
                  <Link
                    key={topic.id}
                    href={`/episodes?topic=${slug}`}
                    data-active={topicFilter === slug}
                    className="rounded-full border border-ink/12 bg-white px-4 py-2 text-xs font-semibold transition hover:border-ink/40 data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-white"
                  >
                    {topic.title}
                  </Link>
                );
              })}
            </nav>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              title={
                topicFilter
                  ? `No episodes tagged "${activeTopic?.title || topicFilter}" yet`
                  : 'Episode 01 is on its way.'
              }
              hint={
                topicFilter
                  ? 'Try another topic, or clear the filter.'
                  : 'Subscribe on YouTube to hear it the day it comes out.'
              }
              action={
                topicFilter ? (
                  <Button href="/episodes" variant="outline-dark">
                    Clear filter
                  </Button>
                ) : youtube ? (
                  <Button href={youtube} external variant="outline-dark" arrow>
                    Subscribe on YouTube
                  </Button>
                ) : null
              }
            />
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((episode, i) => (
                <li key={episode.id}>
                  <Reveal delay={(i % 3) * 70}>
                    <EpisodeCard episode={episode} guests={guestsOf(episode, voices)} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
