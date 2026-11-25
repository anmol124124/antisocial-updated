import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { getChapterBySlug, getChapters, slugify } from '@/lib/content';
import { STATUS_LABEL } from '@/components/live/ChapterCard';
import { JoinActions } from '@/components/chapters/Blocks';

export const revalidate = 60;

export async function generateStaticParams() {
  const chapters = await getChapters();
  return chapters.map((c) => ({ slug: c.slug || slugify(c.city) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);
  if (!chapter) return { title: 'Chapter not found' };
  return {
    title: `AntiSocialTalks Chapters · ${chapter.city}`,
    description: metaDescription(chapter.theme, `AntiSocialTalks Chapters in ${chapter.city}.`),
    alternates: { canonical: `/chapters/${slug}` },
  };
}

/**
 * `team`, `schedule`, `partners` and `past_talks` are free-text fields in
 * Directus, so they are rendered as simple line-per-entry lists — one line in
 * the CMS, one row here.
 */
function Lines({ value }: { value: string | null }) {
  const lines = (value || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul className="space-y-2.5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-mute">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sand" />
          {line}
        </li>
      ))}
    </ul>
  );
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const date = chapter.event_date
    ? new Date(chapter.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const sections = [
    { title: 'The team', value: chapter.team },
    { title: 'Schedule', value: chapter.schedule },
    { title: 'Partners', value: chapter.partners },
    { title: 'Past talks', value: chapter.past_talks },
  ].filter((s) => (s.value || '').trim().length > 0);

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-[30rem] w-[30rem] rounded-full opacity-[0.14] blur-[110px]"
          style={{ background: 'radial-gradient(circle, #c8a67f 0%, transparent 70%)' }}
        />
        <Container className="relative z-10 py-14 lg:py-20">
          <Link
            href="/chapters"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All chapters
          </Link>

          <Reveal>
            <Eyebrow tone="light">AntiSocialTalks Chapters</Eyebrow>
            <h1 className="display text-[clamp(2.25rem,6vw,4rem)]">{chapter.city}</h1>
            {chapter.theme && (
              <p className="mt-4 font-serif text-2xl italic text-sand">{chapter.theme}</p>
            )}

            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {date && (
                <div>
                  <dt className="eyebrow text-white/45">When</dt>
                  <dd className="mt-1.5 text-sm font-medium">{date}</dd>
                </div>
              )}
              {chapter.venue && (
                <div>
                  <dt className="eyebrow text-white/45">Where</dt>
                  <dd className="mt-1.5 text-sm font-medium">{chapter.venue}</dd>
                </div>
              )}
              <div>
                <dt className="eyebrow text-white/45">Status</dt>
                <dd className="mt-1.5 text-sm font-medium capitalize">
                  {STATUS_LABEL[chapter.status] || chapter.status.replace('_', ' ')}
                </dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-wrap gap-3">
              {chapter.registration_url ? (
                <Button href={chapter.registration_url} external variant="solid-light" arrow>
                  Register
                </Button>
              ) : (
                <Button href="/community" variant="solid-light" arrow>
                  Get notified
                </Button>
              )}
              <Button href="/chapters/apply/speak" variant="outline-light" arrow>
                Nominate a Speaker
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {sections.length > 0 && (
        <section className="bg-cream py-16 lg:py-24">
          <Container>
            <div className="grid gap-10 sm:grid-cols-2">
              {sections.map((section, i) => (
                <Reveal key={section.title} delay={i * 70}>
                  <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-ink/[0.06]">
                    <h2 className="mb-5 text-lg font-bold tracking-tight">{section.title}</h2>
                    <Lines value={section.value} />
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <JoinActions
        title={`Build the ${chapter.city} chapter.`}
        lede={`Lead it, nominate a speaker from ${chapter.city}, volunteer, or plan its first event.`}
      />
    </>
  );
}
