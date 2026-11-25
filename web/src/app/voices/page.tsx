import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { VoiceRow } from '@/components/guests/VoiceRow';
import { getGuests } from '@/lib/content';

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageLinks('/voices'),
  title: 'Meet the Voices',
  description:
    'Founders, scientists, artists, athletes and everyday people. Everyone who has sat down with AntiSocialTalks.',
};

export default async function VoicesPage() {
  const guests = await getGuests(200);

  return (
    <>
      <PageHero
        eyebrow="Meet the Voices"
        title="They’ve been interviewed before."
        accent="Not like this."
        lede="Each of them sat down with us and answered the same question on the record."
      >
        <Button href="/community/speaker" variant="solid-light" arrow>
          Suggest a Speaker
        </Button>
      </PageHero>

      <section className="bg-cream py-16 lg:py-24">
        <Container>
          {guests.length === 0 ? (
            <EmptyState
              title="Our first voices will be announced here."
              hint="Know someone we should talk to?"
              action={
                <Button href="/community/speaker" variant="outline-dark" arrow>
                  Suggest a Speaker
                </Button>
              }
            />
          ) : (
            <>
              <p className="mb-12 text-sm text-ink-mute">
                {guests.length} {guests.length === 1 ? 'voice' : 'voices'}
              </p>
              <ol className="divide-y divide-ink/10">
                {guests.map((guest, i) => (
                  <li key={guest.id} className="py-14 first:pt-0 last:pb-0 lg:py-20">
                    <Reveal>
                      <VoiceRow guest={guest} index={i} flip={i % 2 === 1} />
                    </Reveal>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Container>
      </section>
    </>
  );
}
