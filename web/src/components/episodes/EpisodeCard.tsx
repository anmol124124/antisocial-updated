import Link from 'next/link';
import { slugify, youtubeId, type Episode } from '@/lib/content';

function hostName(host: Episode['host']): string | null {
  return host && typeof host === 'object' ? host.name : null;
}

/** "Abdu Rozik", "Reem Elkot & Alaa Sediik". */
const names = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}` : list[0] || '');

/** One episode in the grid: its picture, date, voices and title. Not out yet: "Coming Soon", never "Watch". */
export function EpisodeCard({ episode, guests = [] }: { episode: Episode; guests?: string[] }) {
  const published = episode.status === 'published';
  const slug = slugify(episode.title);
  const videoId = youtubeId(episode.youtube_url);
  const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  const host = hostName(episode.host);

  const date = episode.publish_date
    ? new Date(episode.publish_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : null;

  return (
    <article className="group h-full">
      <Link
        href={`/episodes/${slug}`}
        className="flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-ink/[0.06] transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
      >
        <div className="grain relative aspect-video overflow-hidden bg-ink">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.05]"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(55% 60% at 45% 45%, #9a8f86 0%, #4d453f 35%, #141110 80%)',
              }}
            />
          )}
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] backdrop-blur ${
              published ? 'bg-white/90 text-ink' : 'bg-black/55 text-white'
            }`}
          >
            {!published && <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sand" />}
            {published ? 'Watch' : 'Coming Soon'}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-mute">
            {date && <span>{date}</span>}
            {host && (
              <>
                <span aria-hidden className="h-1 w-1 rounded-full bg-sand" />
                <span>{host}</span>
              </>
            )}
          </div>

          <h3 className="mt-3 text-base font-bold leading-snug tracking-tight">{episode.title}</h3>
          {guests.length > 0 && <p className="mt-1.5 text-sm font-medium text-sand-deep">With {names(guests)}</p>}

          {episode.description && (
            <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-mute">
              {episode.description}
            </p>
          )}

          <span className="mt-5 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink">
            {published ? 'Watch the Episode' : 'Coming Soon'}
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
        </div>
      </Link>
    </article>
  );
}
