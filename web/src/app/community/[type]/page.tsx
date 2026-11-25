import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { SubmissionForm } from '@/components/forms/SubmissionForm';
import { WAYS, wayBySlug } from '@/lib/community';

export function generateStaticParams() {
  return WAYS.map((w) => ({ type: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const way = wayBySlug(type);
  if (!way) return { title: 'Not found' };
  return {
    title: way.title,
    description: metaDescription(way.lede),
    alternates: { canonical: `/community/${way.slug}` },
  };
}

export default async function CommunityFormPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const way = wayBySlug(type);
  if (!way) notFound();

  const others = WAYS.filter((w) => w.slug !== way.slug);

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full opacity-[0.14] blur-[110px]"
          style={{ background: 'radial-gradient(circle, #c8a67f 0%, transparent 70%)' }}
        />
        <Container className="relative z-10 py-14 lg:py-20">
          <Link
            href="/community"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All the ways in
          </Link>

          <Reveal>
            <Eyebrow tone="light">{way.title}</Eyebrow>
            <h1 className="display max-w-3xl text-[clamp(2rem,5vw,3.5rem)]">
              {way.heading} <span className="font-serif font-normal italic text-sand">{way.accent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-white/70">{way.lede}</p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-cream py-16 lg:py-20">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-10">
              <SubmissionForm
                type={way.slug}
                messageLabel={way.messageLabel}
                messagePlaceholder={way.messagePlaceholder}
                showInterest={way.showInterest}
                submitLabel={way.submitLabel}
              />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mx-auto mt-14 max-w-2xl">
              <h2 className="eyebrow mb-5 text-ink-mute">Or take a different way in</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/community/${other.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-5 py-4 text-sm font-semibold transition hover:border-ink/30"
                    >
                      {other.title}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="h-3.5 w-3.5 text-ink-mute transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
