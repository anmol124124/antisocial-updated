import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Band, Cards, GuideLinks, JoinActions, Note } from '@/components/chapters/Blocks';
import { CHAPTER_ACTIVITIES, CHAPTER_FRAMEWORK, FIRST_EVENT_RUNSHEET, MISSION } from '@/lib/chapter-content';

export const metadata: Metadata = {
  title: 'What Happens in a Chapter?',
  description: 'Conversations, speakers, community, stories and opportunities: what an AntiSocialTalks chapter does in its city.',
  alternates: { canonical: '/chapters/what-happens' },
};

export default function WhatHappensPage() {
  return (
    <>
      <PageHero eyebrow="What Happens in a Chapter?" title="Local voices." accent="Local stories." lede={MISSION}>
        <div className="flex flex-wrap gap-3">
          <Button href="/chapters" variant="solid-light" arrow>
            See the Chapters
          </Button>
          <Button href="/chapters/start" variant="outline-light" arrow>
            Start a Chapter
          </Button>
        </div>
      </PageHero>

      <Band eyebrow="Inside a Chapter" title="What a chapter does.">
        <Cards items={CHAPTER_ACTIVITIES} cols={5} />
        <Note>{CHAPTER_FRAMEWORK}</Note>
      </Band>

      <Band tone="dark" eyebrow="A Typical Evening" title="The first conversation, in 90 minutes." lede="Three speakers. About 20 to 50 attendees. One theme.">
        <Cards tone="dark" cols={5} items={FIRST_EVENT_RUNSHEET.map((r) => ({ label: r.time, title: r.title, body: r.body }))} />
      </Band>

      <Band eyebrow="Guides" title="Go deeper.">
        <GuideLinks current="/chapters/what-happens" />
      </Band>

      <JoinActions />
    </>
  );
}
