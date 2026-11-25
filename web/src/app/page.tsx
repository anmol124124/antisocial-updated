import { Hero } from '@/components/home/Hero';
import { FeaturedEpisode } from '@/components/home/FeaturedEpisode';
import { GuestsPreview } from '@/components/home/GuestsPreview';
import { ChaptersFeature } from '@/components/home/ChaptersFeature';
import { Intro } from '@/components/home/Intro';
import { IntroSplash } from '@/components/home/IntroSplash';
import { Topics } from '@/components/home/Topics';
import { Pillars } from '@/components/home/Pillars';
import { FinalCta } from '@/components/home/FinalCta';
import { featuredOf, getEpisodes, getGuests, getHomeGuests, guestsOf } from '@/lib/content';
import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { getHomePage, getHomePillars, getSiteSettings, youtubeChannel } from '@/lib/site-content';

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
  const [episodes, guests, voices, home, pillars, settings] = await Promise.all([
    getEpisodes(),
    getHomeGuests(5),
    getGuests(200),
    getHomePage(),
    getHomePillars(),
    getSiteSettings(),
  ]);
  const episode = featuredOf(episodes);

  return (
    <>
      {/* The order and backgrounds of the homepage brief: black, black, black, black, white, black, light, black. */}
      <IntroSplash />
      <Hero lines={home.heroLines} />
      <Intro paragraphs={home.intro} />
      <FeaturedEpisode episode={episode} guests={guestsOf(episode, voices)} youtube={youtubeChannel(settings)} teaser={home.teaser} />
      <GuestsPreview guests={guests} />
      <ChaptersFeature />
      <Topics topics={home.topics} />
      <Pillars pillars={pillars} />
      <FinalCta />
    </>
  );
}
