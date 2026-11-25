import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChapterCard } from '@/components/live/ChapterCard';
import { Band, Cards, GuideLinks, JoinActions, Note, Steps } from '@/components/chapters/Blocks';
import { getChapters } from '@/lib/content';
import { CHAPTER_ACTIVITIES, CHAPTER_FRAMEWORK, FOUNDER_QUESTIONS, FOUNDER_STEPS, FOUNDER_STEPS_NOTE, NETWORK } from '@/lib/chapter-content';

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageLinks('/chapters'),
  title: 'AntiSocial Chapters',
  description: 'A global network of local chapters bringing podcasts, live talks, events and local storytelling to communities around the world.',
};

/**
 * Chapters Around the World: what a chapter is, the cities so far, how to
 * start one, and the guides. In-person events are on /events.
 */
export default async function ChaptersPage() {
  const chapters = await getChapters();

  return (
    <>
      <PageHero eyebrow="Chapters Around the World" title="Each chapter is AntiSocialTalks in one place," accent="with local voices and local stories." lede={NETWORK}>
        <div className="flex flex-wrap gap-3">
          <Button href="/chapters/start" variant="solid-light" arrow>
            Start a Chapter
          </Button>
          <Button href="#chapters" variant="outline-light" arrow>
            See the Chapters
          </Button>
        </div>
      </PageHero>

      <Band eyebrow="What a Chapter Does" title="Five things every chapter does.">
        <Cards items={CHAPTER_ACTIVITIES} cols={5} />
        <Note>{CHAPTER_FRAMEWORK}</Note>
      </Band>

      <Band id="chapters" tone="sand" eyebrow="Our Chapters" title="Pick your city." lede="Dubai, the USA and India come first. Any city can apply to start a chapter.">
        <div className="mt-10">
          {chapters.length === 0 ? (
            <EmptyState title="Chapters will be listed here soon." />
          ) : (
            <ul className="grid gap-6 md:grid-cols-3">
              {chapters.map((chapter, i) => (
                <li key={chapter.id}>
                  <Reveal delay={(i % 3) * 70} className="h-full">
                    <ChapterCard chapter={chapter} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Reveal delay={120}>
          <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.9375rem] text-ink">
              <span className="font-bold">Your city isn’t listed?</span> Start the chapter there.
            </p>
            <Button href="/chapters/start" variant="solid-dark" arrow className="shrink-0">
              Start a Chapter
            </Button>
          </div>
        </Reveal>
      </Band>

      <Band tone="dark" eyebrow="How Someone Starts a Chapter" title="Five questions to apply." accent="Six steps to launch.">
        <Cards tone="dark" cols={5} items={FOUNDER_QUESTIONS.map((q) => ({ label: q.label, title: q.body }))} />
        <Steps steps={FOUNDER_STEPS} tone="dark" />
        <Note tone="dark">{FOUNDER_STEPS_NOTE}</Note>
        <Reveal delay={140}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/chapters/start" variant="solid-light" arrow>
              Start a Chapter
            </Button>
            <Button href="/chapters/become-a-leader" variant="outline-light" arrow>
              Become a Chapter Leader
            </Button>
          </div>
        </Reveal>
      </Band>

      <Band eyebrow="Guides" title="Everything a chapter needs to get going.">
        <GuideLinks />
      </Band>

      <JoinActions />
    </>
  );
}
