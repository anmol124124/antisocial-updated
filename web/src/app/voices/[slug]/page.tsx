import type { Metadata } from 'next';
import { metaDescription, pageLinks, shareImage } from '@/lib/meta';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Media, initials } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';
import { GuestCard } from '@/components/guests/GuestCard';
import { assetUrl } from '@/lib/directus';
import { getGuestBySlug, getGuests, slugify } from '@/lib/content';

export const revalidate = 60;

/**
 * A voice's address comes from their name, so fixing a spelling moves the
 * page. The old address forwards to the new one once the CMS has the new name
 * (and keeps working until then).
 */
const RENAMED: Record<string, string> = {
  'reem-elkott': 'reem-elkot', // "Reem Elkot", as on YouTube (18 Nov 2026)
};

export async function generateStaticParams() {
  const guests = await getGuests(200);
  return guests.map((g) => ({ slug: slugify(g.name) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guest = await getGuestBySlug(slug);
  if (!guest) return { title: 'Voice not found' };
  return {
    title: guest.name,
    description: metaDescription(guest.bio || guest.designation, `${guest.name}, one of the voices on AntiSocialTalks.`),
    ...pageLinks(`/voices/${slug}`, shareImage(guest.photo, guest.name)),
  };
}

export default async function GuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [guest, all] = await Promise.all([getGuestBySlug(slug), getGuests(200)]);

  if (!guest) {
    const renamed = RENAMED[slug];
    if (renamed && all.some((g) => slugify(g.name) === renamed)) permanentRedirect(`/voices/${renamed}`);
    notFound();
  }

  const episode = guest.episode && typeof guest.episode === 'object' ? guest.episode : null;
  const others = all.filter((g) => g.id !== guest.id).slice(0, 4);

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <Container className="relative z-10 py-14 lg:py-20">
          <Link
            href="/voices"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All voices
          </Link>

          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal className="group">
              <Media
                src={assetUrl(guest.photo, { width: 900, height: 1125 })}
                alt={`Portrait of ${guest.name}`}
                fallbackLabel={initials(guest.name)}
                priority
                sizes="(max-width: 1024px) 100vw, 34vw"
                className="aspect-[4/5] w-full rounded-[1.75rem] shadow-2xl shadow-black/40"
              />
            </Reveal>

            <Reveal delay={100}>
              <Eyebrow tone="light">Voice</Eyebrow>
              <h1 className="display text-[clamp(2rem,5vw,3.5rem)]">{guest.name}</h1>
              {guest.designation && (
                <p className="mt-4 font-serif text-xl italic text-sand">{guest.designation}</p>
              )}
              {guest.teaser && (
                <blockquote className="mt-6 border-l-2 border-sand pl-5 font-serif text-2xl italic leading-snug text-white">
                  &ldquo;{guest.teaser}&rdquo;
                </blockquote>
              )}
              {guest.bio && (
                <p className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-white/75">
                  {guest.bio}
                </p>
              )}

              <div className="mt-9 flex flex-wrap gap-3">
                {episode && (
                  <Button href={`/episodes/${slugify(episode.title)}`} variant="solid-light" arrow>
                    {episode.status === 'published' ? 'Watch the episode' : 'See the episode'}
                  </Button>
                )}
                {guest.instagram_url && (
                  <Button href={guest.instagram_url} external variant="outline-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="h-3.5 w-3.5">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                    </svg>
                    Instagram
                  </Button>
                )}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {others.length > 0 && (
        <section className="bg-cream py-20 lg:py-24">
          <Container>
            <Reveal>
              <Eyebrow>Keep going</Eyebrow>
              <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">More voices.</h2>
            </Reveal>
            <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
              {others.map((other, i) => (
                <li key={other.id}>
                  <Reveal delay={i * 60}>
                    <GuestCard guest={other} tone={i} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
