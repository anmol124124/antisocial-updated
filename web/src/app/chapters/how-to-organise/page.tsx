import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Band, Cards, GuideLinks, JoinActions, Note, Steps } from '@/components/chapters/Blocks';
import { EVENT_GUIDE_NOTE, EVENT_GUIDE_STEPS, FIRST_EVENT_RUNSHEET } from '@/lib/chapter-content';

export const metadata: Metadata = {
  title: 'How to Organise an Event',
  description: 'A repeatable 90-minute first event for AntiSocialTalks chapters: three speakers, 20 to 50 attendees, one theme.',
  alternates: { canonical: '/chapters/how-to-organise' },
};

export default function HowToOrganisePage() {
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
        <Cards cols={5} items={FIRST_EVENT_RUNSHEET.map((r) => ({ label: r.time, title: r.title, body: r.body }))} />
      </Band>

      <Band tone="dark" eyebrow="The Full Guide" title="Eight steps.">
        <Steps steps={EVENT_GUIDE_STEPS} tone="dark" />
        <Note tone="dark">{EVENT_GUIDE_NOTE}</Note>
      </Band>

      <Band eyebrow="Guides" title="Before and after the event.">
        <GuideLinks current="/chapters/how-to-organise" />
      </Band>

      <JoinActions title="Plan it with us." />
    </>
  );
}
