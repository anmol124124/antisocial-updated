import Link from 'next/link';
import { slugify, type Chapter } from '@/lib/content';

export const STATUS_LABEL: Record<string, string> = {
  coming_soon: 'Coming Soon',
  announced: 'Announced',
  published: 'Tickets open',
};

export function ChapterCard({ chapter }: { chapter: Chapter }) {
  const slug = chapter.slug || slugify(chapter.city);
  const date = chapter.event_date
    ? new Date(chapter.event_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={`/chapters/${slug}`}
      className="group flex h-full flex-col justify-between overflow-hidden rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-ink/[0.06] transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
    >
      <div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] ${
            chapter.status === 'published'
              ? 'bg-sand text-ink'
              : 'border border-ink/12 text-ink-mute'
          }`}
        >
          {chapter.status !== 'published' && (
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sand" />
          )}
          {STATUS_LABEL[chapter.status] || chapter.status}
        </span>

        <h3 className="mt-6 text-[clamp(1.5rem,2.4vw,2rem)] font-bold tracking-tight">
          {chapter.city}
        </h3>
        {chapter.theme && <p className="mt-2 font-serif text-lg italic text-sand-deep">{chapter.theme}</p>}

        <dl className="mt-6 space-y-2 text-sm text-ink-mute">
          {date && (
            <div className="flex gap-2">
              <dt className="font-semibold text-ink">When</dt>
              <dd>{date}</dd>
            </div>
          )}
          {chapter.venue && (
            <div className="flex gap-2">
              <dt className="font-semibold text-ink">Where</dt>
              <dd>{chapter.venue}</dd>
            </div>
          )}
        </dl>
      </div>

      <span className="mt-8 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink">
        See the Chapter
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
  );
}

