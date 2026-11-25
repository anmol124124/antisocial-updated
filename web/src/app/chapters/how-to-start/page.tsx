import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Band, Cards, GuideLinks, JoinActions, Note } from '@/components/chapters/Blocks';
import { getChapterGuide } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'How to Start Your Chapter',
  description: 'From decision to first event in 30 days: a suggested plan for new AntiSocialTalks chapter founders.',
  alternates: { canonical: '/chapters/how-to-start' },
};

export default async function HowToStartPage() {
  const guide = await getChapterGuide();
  return (
    <>
      <PageHero
        eyebrow="How to Start Your Chapter"
        title="From decision to first event"
        accent="in 30 days."
        lede="A suggested plan for your first month as a chapter founder, after your chapter is approved."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/chapters/start" variant="solid-light" arrow>
            Start a Chapter
          </Button>
          <Button href="/chapters/how-to-organise" variant="outline-light" arrow>
            Plan Your First Event
          </Button>
        </div>
      </PageHero>

      <Band eyebrow="Your First 30 Days" title="Six steps, five days each.">
        <Cards cols={3} items={guide.first30Days.map((d) => ({ label: d.days, title: d.title, body: d.body }))} />
        <Note>{guide.first30DaysNote}</Note>
      </Band>

      <Band tone="sand" eyebrow="Guides" title="What comes next.">
        <GuideLinks current="/chapters/how-to-start" />
      </Band>

      <JoinActions />
    </>
  );
}
