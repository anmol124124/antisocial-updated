import Link from 'next/link';
import { Media } from '@/components/ui/Media';
import { assetUrl } from '@/lib/directus';
import { readingMinutes } from '@/lib/blog-html';
import { formatPostDate, postDate, postSlug, type BlogPost } from '@/lib/blog';

/**
 * One post on /blogs and under "More from the blog": its picture, date, title
 * and summary. `lead` is the newest post, set wide across the top of the list.
 */
export function BlogCard({
  post,
  lead = false,
  tone = 0,
  heading: Heading = 'h2',
}: {
  post: BlogPost;
  lead?: boolean;
  tone?: number;
  /** h3 where the cards sit under a section heading of their own. */
  heading?: 'h2' | 'h3';
}) {
  const date = formatPostDate(postDate(post), 'short');
  const minutes = readingMinutes(post.body);
  const frame = `aspect-[16/10] w-full ${lead ? 'lg:aspect-auto lg:h-full lg:min-h-[22rem]' : ''}`;

  return (
    <article className="group h-full">
      <Link
        href={`/blogs/${postSlug(post)}`}
        className={`flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-ink/[0.07] transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 ${
          lead ? 'lg:grid lg:grid-cols-[1.35fr_1fr]' : ''
        }`}
      >
        {post.cover_image ? (
          <Media
            src={assetUrl(post.cover_image, { width: lead ? 1400 : 900, height: lead ? 875 : 563 })}
            alt=""
            tone={tone}
            priority={lead}
            sizes={lead ? '(max-width: 1024px) 100vw, 60vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
            className={frame}
          />
        ) : (
          // No picture in the CMS: the brand's black with a red glow and the name, never a broken image.
          <div aria-hidden className={`grain relative isolate flex items-end overflow-hidden bg-ink p-6 ${frame}`}>
            <div
              className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.05]"
              style={{ background: 'radial-gradient(70% 80% at 85% 110%, rgba(229,20,27,0.55) 0%, rgba(229,20,27,0) 70%)' }}
            />
            <span className="relative font-display text-2xl font-black tracking-[-0.04em] text-white">
              AntiSocial<span className="font-medium">Talks</span>
            </span>
          </div>
        )}

        <div className={`flex flex-1 flex-col ${lead ? 'p-7 sm:p-9 lg:p-12' : 'p-6'}`}>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-mute">
            {lead && <span className="text-signal">Latest</span>}
            {lead && date && <span aria-hidden className="h-1 w-1 rounded-full bg-signal" />}
            {date && <time dateTime={postDate(post) || undefined}>{date}</time>}
            <span aria-hidden className="h-1 w-1 rounded-full bg-ink/25" />
            <span>{minutes} min read</span>
          </p>

          <Heading
            className={`mt-3 font-display font-extrabold leading-[1.08] tracking-[-0.02em] text-ink ${
              lead ? 'text-[clamp(1.6rem,3vw,2.4rem)]' : 'text-xl'
            }`}
          >
            {post.title}
          </Heading>

          {post.summary && (
            <p className={`mt-3 flex-1 leading-relaxed text-ink-mute ${lead ? 'line-clamp-4 text-base' : 'line-clamp-3 text-sm'}`}>
              {post.summary}
            </p>
          )}

          <span className="mt-6 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink transition-colors group-hover:text-signal">
            Read the post
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}
