import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import Link from 'next/link';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { SubmissionForm } from '@/components/forms/SubmissionForm';
import { WAYS } from '@/lib/community';

export const metadata: Metadata = {
  ...pageLinks('/community'),
  title: 'Join the Community',
  description:
    'Share your story, submit a question, suggest a speaker, join the community or partner with us.',
};

export default function CommunityPage() {
  return (
    <>
      <PageHero
        eyebrow="Join the Community"
        title="Everyone has"
        accent="a voice."
        lede="Pick the form that fits. A person reads every submission, and nothing is published without your permission."
      />

      <section className="bg-cream py-16 lg:py-24">
        <Container>
          <Reveal>
            <Eyebrow>Ways in</Eyebrow>
            <h2 className="display max-w-2xl text-[clamp(1.75rem,3.4vw,2.5rem)]">
              Pick the one that fits.
            </h2>
          </Reveal>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WAYS.filter((w) => w.slug !== 'community').map((way, i) => (
              <li key={way.slug}>
                <Reveal delay={i * 70}>
                  <Link
                    href={`/community/${way.slug}`}
                    className="group flex h-full flex-col justify-between rounded-[1.5rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
                  >
                    <div>
                      <span className="font-serif text-3xl italic text-sand">0{i + 1}</span>
                      <h3 className="mt-4 text-base font-bold tracking-tight">{way.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-mute">{way.blurb}</p>
                    </div>
                    <span className="mt-6 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em]">
                      {way.cta}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="join" className="bg-cream-deep py-16 lg:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <Eyebrow>Join the Community</Eyebrow>
              <h2 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">
                Be part of the
                <br />
                <span className="font-serif font-normal italic text-sand-deep">conversation.</span>
              </h2>
              <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-ink-mute">
                We email you when a new episode comes out or a chapter opens in your city. That’s all
                we send, and we never share your address.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06] lg:p-9">
                <SubmissionForm
                  type="community"
                  messageLabel="Anything you want us to know"
                  messagePlaceholder="Optional. What brought you here?"
                  submitLabel="Join the community"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
