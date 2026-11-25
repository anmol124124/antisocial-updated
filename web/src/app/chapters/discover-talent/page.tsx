import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Band, GuideLinks, JoinActions, Note } from '@/components/chapters/Blocks';
import { SPEAKER_QUALITIES, TALENT_SOURCES } from '@/lib/chapter-content';

export const metadata: Metadata = {
  title: 'Discover Talent',
  description: 'Where AntiSocialTalks chapters find speakers, what makes a speaker, and how to nominate a voice.',
  alternates: { canonical: '/chapters/discover-talent' },
};

const NOMINATION_FIELDS = [
  'Name and affiliation',
  'City and country',
  'Proposed idea, story or subject',
  'Why it matters to a wider audience',
  'Short bio or background',
  'Links to existing work',
  'Spoken publicly before? Yes or no',
  'Contact details and consent to be contacted',
];

export default function DiscoverTalentPage() {
  return (
    <>
      <PageHero
        eyebrow="Discover Talent"
        title="Discover the voices"
        accent="the world hasn’t heard yet."
        lede="Experts and emerging voices, including people who have never had a platform."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/chapters/apply/speak" variant="solid-light" arrow>
            Nominate a Voice
          </Button>
        </div>
      </PageHero>

      <Band>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-ink/[0.06]">
              <h2 className="text-xl font-bold tracking-tight">Where chapters look</h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">{TALENT_SOURCES}</p>
              <h2 className="mt-8 text-xl font-bold tracking-tight">What makes a speaker</h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-mute">{SPEAKER_QUALITIES}</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="h-full rounded-[1.5rem] bg-ink p-8 text-white">
              <h2 className="text-xl font-bold tracking-tight">Nominate a Voice</h2>
              <p className="mt-2 text-sm text-white/60">What the form asks for:</p>
              <ol className="mt-5 space-y-2.5 text-sm">
                {NOMINATION_FIELDS.map((f, i) => (
                  <li key={f} className="flex gap-3">
                    <span className="w-5 shrink-0 font-serif italic text-sand/80">{i + 1}</span>
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Button href="/chapters/apply/speak" variant="solid-light" arrow>
                  Nominate a Voice
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
        <Note>
          Self-nominations and nominations by others are both welcome. Nothing about a nominee, including their story,
          is published without their consent.
        </Note>
      </Band>

      <Band tone="sand" eyebrow="Guides" title="More for chapter teams.">
        <GuideLinks current="/chapters/discover-talent" />
      </Band>

      <JoinActions />
    </>
  );
}
