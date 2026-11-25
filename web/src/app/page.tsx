import { Hero } from '@/components/home/Hero';
import { FeaturedEpisode } from '@/components/home/FeaturedEpisode';
import { GuestsPreview } from '@/components/home/GuestsPreview';
import { ChaptersFeature } from '@/components/home/ChaptersFeature';
import { TheQuestion } from '@/components/home/TheQuestion';
import { Topics } from '@/components/home/Topics';
import { Pillars } from '@/components/home/Pillars';
import { FinalCta } from '@/components/home/FinalCta';
import { featuredOf, getEpisodes, getGuests, getHomeGuests, guestsOf } from '@/lib/content';
import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';

export const revalidate = 60;

const links = pageLinks('/');
export const metadata: Metadata = {
  ...links,
  // The home page's share card carries the brand line rather than the page title.
  openGraph: {
    ...links.openGraph,
    title: 'They called us AntiSocial. We decided to talk.',
    description: 'Conversations with founders, artists and everyday people, on the podcast and at live events in your city.',
  },
};

export default async function HomePage() {
  // One round of reads for the whole page, in parallel.
  const [episodes, guests, voices] = await Promise.all([getEpisodes(), getHomeGuests(3), getGuests(200)]);
  const episode = featuredOf(episodes);

  return (
    <>
      <Hero />
      <FeaturedEpisode episode={episode} guests={guestsOf(episode, voices)} />
      <GuestsPreview guests={guests} />
      <ChaptersFeature />
      <TheQuestion />
      <Topics />
      <Pillars />
      <FinalCta />
    </>
  );
}
