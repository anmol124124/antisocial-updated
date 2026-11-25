import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Media, initials } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { getHosts } from '@/lib/content';
import { assetUrl } from '@/lib/directus';

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageLinks('/about'),
  title: 'About',
  description:
    'AntiSocialTalks is a global conversation and media platform exploring people, ideas and stories that challenge conventional thinking.',
};

const VALUES = [
  {
    title: 'Better questions',
    body: 'We look for the question that makes a guest stop and think before they answer.',
  },
  {
    title: 'No easy outs',
    body: 'We keep the awkward parts of the conversation that most interviews edit out.',
  },
  {
    title: 'Everyone has a voice',
    body: 'Founders, scientists, artists and athletes, alongside people who have never been interviewed before. What matters is having something to say.',
  },
  {
    title: 'Anti-silence',
    body: 'We are not against society. We are against keeping quiet about the things that matter.',
  },
];

export default async function AboutPage() {
  const hosts = await getHosts();

  return (
    <>
      <PageHero
        eyebrow="About"
        title="They called us AntiSocial."
        accent="We decided to talk."
        lede="Founders. Artists. Misfits. Everyday people with something real to say. We put them in a room, ask the question nobody else will, and let the conversation go wherever it goes. Not anti-society. Anti-silence."
      >
        <Button href="/community" variant="solid-light" arrow>
          Join the Community
        </Button>
      </PageHero>

      <section className="bg-cream py-20 lg:py-28">
        <Container>
          <Reveal>
            <Eyebrow>What We Stand For</Eyebrow>
            <h2 className="display max-w-2xl text-[clamp(1.875rem,3.8vw,2.75rem)]">
              Four things we refuse to negotiate on.
            </h2>
          </Reveal>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {VALUES.map((value, i) => (
              <li key={value.title}>
                <Reveal delay={i * 70}>
                  <div className="h-full rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-ink/[0.06]">
                    <span className="font-serif text-3xl italic text-sand">0{i + 1}</span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight">{value.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-mute">{value.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="hosts" className="scroll-mt-24 bg-cream-deep py-20 lg:py-28">
        <Container>
          <Reveal>
            <Eyebrow>The Hosts</Eyebrow>
            <h2 className="display max-w-2xl text-[clamp(1.875rem,3.8vw,2.75rem)]">
              The people asking the questions.
            </h2>
          </Reveal>

          <div className="mt-12">
            {hosts.length === 0 ? (
              <EmptyState
                title="Host profiles will be up here shortly."
              />
            ) : (
              <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {hosts.map((host, i) => (
                  <li key={host.id}>
                    <Reveal delay={i * 60} className="group">
                      <Media
                        src={assetUrl(host.photo, { width: 720, height: 720 })}
                        alt={`Portrait of ${host.name}`}
                        fallbackLabel={initials(host.name)}
                        tone={i}
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="aspect-square w-full rounded-[1.5rem]"
                      />
                      <h3 className="mt-5 flex items-center gap-2 text-base font-bold tracking-tight">
                        {host.name}
                        {host.instagram_url && (
                          <a
                            href={host.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${host.name} on Instagram`}
                            className="text-ink-mute transition-colors hover:text-sand-deep"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                              <rect x="3" y="3" width="18" height="18" rx="5" />
                              <circle cx="12" cy="12" r="4" />
                              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                            </svg>
                          </a>
                        )}
                      </h3>
                      {host.designation && (
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-mute">
                          {host.designation}
                        </p>
                      )}
                      {host.quote && (
                        <blockquote className="mt-4 border-l-2 border-sand pl-4 font-serif text-lg italic leading-snug text-ink">
                          &ldquo;{host.quote}&rdquo;
                        </blockquote>
                      )}
                      {host.bio && (
                        <p className="mt-3 text-sm leading-relaxed text-ink-mute">{host.bio}</p>
                      )}
                    </Reveal>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
