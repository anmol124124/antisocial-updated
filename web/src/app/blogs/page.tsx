import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { BlogCard } from '@/components/blog/BlogCard';
import { getBlogPosts } from '@/lib/blog';

export const revalidate = 60;

export const metadata: Metadata = {
  ...pageLinks('/blogs'),
  title: 'Blog',
  description: 'Writing from AntiSocialTalks: the ideas behind the conversations, and the questions people rarely get asked.',
};

/** The blog: every published post from the CMS (Blog Posts), newest first and the newest set wide. */
export default async function BlogsPage() {
  const [lead, ...rest] = await getBlogPosts();

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: 'radial-gradient(55% 70% at 50% 100%, rgba(229,20,27,0.14) 0%, rgba(229,20,27,0) 70%)' }}
        />
        <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
          <Reveal>
            <p className="kicker mb-6 text-white/55">The Blog</p>
            <h1 className="headline max-w-4xl text-[clamp(2.75rem,7.5vw,6rem)]">
              Read it. Then <span className="text-signal">talk.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-white/65">
              The ideas behind the conversations, and the questions people rarely get asked.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-cream py-14 lg:py-20">
        <Container>
          {!lead ? (
            <EmptyState
              title="The first post is on its way."
              hint="In the meantime, the conversations are on the episodes page."
              action={
                <Button href="/episodes" variant="outline-dark" arrow>
                  Watch the Episodes
                </Button>
              }
            />
          ) : (
            <>
              <Reveal>
                <BlogCard post={lead} lead />
              </Reveal>
              {rest.length > 0 && (
                <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3">
                  {rest.map((post, i) => (
                    <li key={post.id}>
                      <Reveal delay={(i % 3) * 70} className="h-full">
                        <BlogCard post={post} tone={i + 1} />
                      </Reveal>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Container>
      </section>
    </>
  );
}
