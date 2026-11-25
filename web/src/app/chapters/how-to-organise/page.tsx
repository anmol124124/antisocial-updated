import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Band, Cards, GuideLinks, JoinActions, Note, Steps } from '@/components/chapters/Blocks';
import { getChapterGuide } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'How to Organise an Event',
  description: 'A repeatable 90-minute first event for AntiSocialTalks chapters: three speakers, 20 to 50 attendees, one theme.',
  alternates: { canonical: '/chapters/how-to-organise' },
};

export default async function HowToOrganisePage() {
  const guide = await getChapterGuide();
  return (
    <>
      <PageHero
        eyebrow="How to Organise an Event"
        title="A repeatable"
        accent="90-minute first event."
        lede="Three speakers. About 20 to 50 attendees. One theme."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/chapters/organise" variant="solid-light" arrow>
            Propose an Event
          </Button>
          <Button href="/chapters/start" variant="outline-light" arrow>
            Start a Chapter
          </Button>
        </div>
      </PageHero>

      <Band eyebrow="The Running Order" title="Ninety minutes, five parts.">
        <Cards cols={5} items={guide.runsheet.map((r) => ({ label: r.time, title: r.title, body: r.body }))} />
      </Band>

      <Band tone="dark" eyebrow="The Full Guide" title="Eight steps.">
        <Steps steps={guide.eventGuideSteps} tone="dark" />
        <Note tone="dark">{guide.eventGuideNote}</Note>
      </Band>

      <Band eyebrow="Guides" title="Before and after the event.">
        <GuideLinks current="/chapters/how-to-organise" />
      </Band>

      <JoinActions title="Plan it with us." />
    </>
  );
}
