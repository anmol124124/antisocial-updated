import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { SubmissionForm } from '@/components/forms/SubmissionForm';
import { EpisodeCard } from '@/components/episodes/EpisodeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getEpisodes } from '@/lib/content';

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageLinks('/stories'),
  title: 'AntiSocial Stories',
  description:
    'Stories from people who rarely get asked. Send us yours.',
};

export default async function StoriesPage() {
  const episodes = await getEpisodes(6);

  return (
    <>
      <PageHero
        eyebrow="AntiSocial Stories"
        title="Stories from people"
        accent="who rarely get asked."
        lede="You don’t need a following or a job title to be worth listening to. Some of our best conversations come from people who have never been interviewed before."
      />

      <section className="bg-cream py-20 lg:py-24">
        <Container>
          <Reveal>
            <Eyebrow>Recent conversations</Eyebrow>
            <h2 className="display max-w-2xl text-[clamp(1.75rem,3.4vw,2.5rem)]">
              Stories already on the record.
            </h2>
          </Reveal>

          <div className="mt-10">
            {episodes.length === 0 ? (
              <EmptyState
                title="No stories published yet."
                hint="The first ones go up with Episode 01."
              />
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {episodes.map((episode, i) => (
                  <li key={episode.id}>
                    <Reveal delay={(i % 3) * 70}>
                      <EpisodeCard episode={episode} />
                    </Reveal>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </section>

      <section id="share" className="bg-cream-deep py-20 lg:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <Eyebrow>Share Your Story</Eyebrow>
              <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">
                Tell us what happened
                <br />
                <span className="font-serif font-normal italic text-sand-deep">
                  and why it stayed with you.
                </span>
              </h2>
              <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-ink-mute">
                A person on our team reads every submission. Nothing is published without your
                permission.
              </p>
              <div className="mt-8">
                <Button href="/community" variant="outline-dark" arrow>
                  See all the ways to take part
                </Button>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                <SubmissionForm
                  type="story"
                  messageLabel="Your story"
                  messagePlaceholder="What happened, and why does it still matter to you?"
                  showInterest
                  submitLabel="Share my story"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
