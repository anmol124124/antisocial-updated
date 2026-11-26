import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { metaDescription, pageLinks, shareImage } from '@/lib/meta';
import { siteUrl } from '@/lib/env';
import { assetUrl } from '@/lib/directus';
import { Container } from '@/components/ui/Container';
import { Media } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { BlogCard } from '@/components/blog/BlogCard';
import { cleanPostHtml, readingMinutes } from '@/lib/blog-html';
import { formatPostDate, getBlogPostBySlug, getBlogPosts, postDate, postSlug } from '@/lib/blog';

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: postSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Post not found' };
  const links = pageLinks(`/blogs/${slug}`, shareImage(post.cover_image, post.title, 630));
  return {
    title: post.title,
    description: metaDescription(post.summary || post.body?.replace(/<[^>]*>/g, ' '), `${post.title}, on the AntiSocialTalks blog.`),
    ...links,
    openGraph: {
      ...links.openGraph,
      type: 'article',
      ...(postDate(post) ? { publishedTime: postDate(post)! } : {}),
      ...(post.date_updated ? { modifiedTime: post.date_updated } : {}),
      ...(post.author ? { authors: [post.author] } : {}),
    },
  };
}

/** The structured data search engines read for an article. "<" is escaped so no text can close the tag. */
function articleJson(post: NonNullable<Awaited<ReturnType<typeof getBlogPostBySlug>>>, slug: string) {
  const base = siteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary || undefined,
    datePublished: postDate(post) || undefined,
    dateModified: post.date_updated || postDate(post) || undefined,
    author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'AntiSocialTalks' },
    publisher: { '@type': 'Organization', name: 'AntiSocialTalks', url: base },
    image: post.cover_image ? `${base}/api/assets/${post.cover_image}?width=1200&height=630&fit=cover&format=jpg&quality=85` : undefined,
    mainEntityOfPage: `${base}/blogs/${slug}`,
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, all] = await Promise.all([getBlogPostBySlug(slug), getBlogPosts()]);
  if (!post) notFound();

  const html = cleanPostHtml(post.body);
  const date = formatPostDate(postDate(post));
  const more = all.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJson(post, slug) }} />

      <article>
        <header className="grain relative isolate overflow-hidden bg-ink text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: 'radial-gradient(55% 70% at 50% 100%, rgba(229,20,27,0.12) 0%, rgba(229,20,27,0) 70%)' }}
          />
          <Container className={`relative z-10 pt-12 lg:pt-16 ${post.cover_image ? 'pb-28 sm:pb-36 lg:pb-48' : 'pb-16 lg:pb-24'}`}>
            <Link
              href="/blogs"
              className="mb-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
                <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              All posts
            </Link>
            <Reveal className="mx-auto max-w-3xl">
              <p className="kicker mb-6 text-white/55">The Blog</p>
              <h1 className="headline text-[clamp(2.25rem,5.5vw,4.25rem)]">{post.title}</h1>
              {post.summary && <p className="mt-6 text-[1.0625rem] leading-relaxed text-white/65 sm:text-lg">{post.summary}</p>}
              <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                {post.author && <span className="text-white/80">By {post.author}</span>}
                {post.author && date && <span aria-hidden className="h-1 w-1 rounded-full bg-signal" />}
                {date && <time dateTime={postDate(post) || undefined}>{date}</time>}
                <span aria-hidden className="h-1 w-1 rounded-full bg-signal" />
                <span>{readingMinutes(post.body)} min read</span>
              </p>
            </Reveal>
          </Container>
        </header>

        <div className="bg-cream pb-20 lg:pb-28">
          {post.cover_image && (
            <Container className="-mt-20 sm:-mt-28 lg:-mt-36">
              <Media
                src={assetUrl(post.cover_image, { width: 1800, height: 1013 })}
                alt={post.title}
                priority
                sizes="(max-width: 1200px) 100vw, 1100px"
                className="relative z-10 mx-auto aspect-[16/9] max-w-5xl rounded-[1.25rem] shadow-2xl shadow-black/25"
              />
            </Container>
          )}

          <Container>
            {html ? (
              <div className="prose-post mx-auto max-w-[44rem] pt-12 lg:pt-16" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="mx-auto max-w-[44rem] pt-12 text-ink-mute">This post has no text yet.</p>
            )}

            <div className="mx-auto mt-14 flex max-w-[44rem] flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-8">
              <p className="font-display text-xl font-extrabold tracking-[-0.02em]">
                Got something to say? <span className="text-signal">Say it.</span>
              </p>
              <Button href="/community/story" variant="solid-dark" arrow>
                Tell Your Story
              </Button>
            </div>
          </Container>
        </div>
      </article>

      {more.length > 0 && (
        <section aria-labelledby="more-title" className="border-t border-ink/10 bg-paper py-16 lg:py-24">
          <Container>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="kicker mb-4 text-ink-mute">Keep reading</p>
                <h2 id="more-title" className="headline text-[clamp(2rem,4vw,3rem)]">
                  More from the <span className="text-signal">blog.</span>
                </h2>
              </div>
              <Button href="/blogs" variant="outline-dark" arrow>
                All posts
              </Button>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p, i) => (
                <li key={p.id}>
                  <Reveal delay={i * 70} className="h-full">
                    <BlogCard post={p} tone={i + 1} heading="h3" />
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
