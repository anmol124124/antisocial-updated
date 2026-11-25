import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Band, Cards, GuideLinks, JoinActions, Note, Steps } from '@/components/chapters/Blocks';
import { CHAPTER_ACTIVITIES, CHAPTER_FRAMEWORK, FOUNDER_STEPS, FOUNDER_STEPS_NOTE, VISION } from '@/lib/chapter-content';

export const metadata: Metadata = {
  title: 'Become a Chapter Leader',
  description: 'Lead the AntiSocialTalks chapter in your city: what chapter leaders do, the support from the global team, and the six steps to launch.',
  alternates: { canonical: '/chapters/become-a-leader' },
};

export default function BecomeLeaderPage() {
  return (
    <>
      <PageHero
        eyebrow="Become a Chapter Leader"
        title="Ready to lead?"
        accent="Start a chapter in your city."
        lede="Create a platform for voices that deserve to be heard. Don’t just attend inspiring talks. Create the platform that makes them possible."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/chapters/start" variant="solid-light" arrow>
            Start a Chapter
          </Button>
          <Button href="/chapters/how-to-start" variant="outline-light" arrow>
            Your First 30 Days
          </Button>
        </div>
      </PageHero>

      <Band eyebrow="What Chapter Leaders Do" title="You run the chapter’s programme." lede={VISION}>
        <Cards items={CHAPTER_ACTIVITIES} cols={5} />
      </Band>

      <Band tone="sand" eyebrow="What the Global Team Provides" title="You’re not doing it alone.">
        <Cards
          cols={4}
          items={[
            { title: 'The framework', body: 'How a chapter runs inside the global brand and chapter standards.' },
            { title: 'Brand guidance', body: 'How to use the AntiSocialTalks name and identity, once authorised.' },
            { title: 'Speaker standards', body: 'What makes a speaker, and how speakers are prepared.' },
            { title: 'Onboarding', body: 'A founder orientation, then support through your launch plan.' },
          ]}
        />
        <Note>{CHAPTER_FRAMEWORK}</Note>
      </Band>

      <Band tone="dark" eyebrow="From Application to Launch" title="Six steps.">
        <Steps steps={FOUNDER_STEPS} tone="dark" />
        <Note tone="dark">{FOUNDER_STEPS_NOTE}</Note>
      </Band>

      <Band eyebrow="Guides" title="Read before you apply.">
        <GuideLinks current="/chapters/become-a-leader" />
      </Band>

      <JoinActions title="Ready when you are." />
    </>
  );
}
