import Link from 'next/link';
import { Media, initials } from '@/components/ui/Media';
import { assetUrl } from '@/lib/directus';
import { slugify, type Guest } from '@/lib/content';

export function GuestCard({ guest, tone = 0 }: { guest: Guest; tone?: number }) {
  const slug = slugify(guest.name);

  return (
    <article className="group">
      <Link href={`/voices/${slug}`} className="block">
        <div className="relative overflow-hidden rounded-2xl">
          <Media
            src={assetUrl(guest.photo, { width: 720, height: 900 })}
            alt={`Portrait of ${guest.name}`}
            fallbackLabel={initials(guest.name)}
            tone={tone}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            className="aspect-[4/5] w-full"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          {guest.paired_with_label && (
            <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
              {guest.paired_with_label}
            </span>
          )}
        </div>
      </Link>

      <h3 className="mt-4 flex items-start gap-2 text-[0.9375rem] font-semibold leading-snug tracking-tight">
        <Link href={`/voices/${slug}`} className="link-underline">
          {guest.name}
        </Link>
        {guest.instagram_url && (
          <a
            href={guest.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${guest.name} on Instagram`}
            className="mt-0.5 shrink-0 text-ink-mute transition-colors hover:text-sand-deep"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
          </a>
        )}
      </h3>
      {guest.designation && <p className="mt-1 text-xs text-ink-mute">{guest.designation}</p>}
      {guest.teaser && (
        <p className="mt-2 font-serif text-[0.9375rem] italic leading-snug text-ink">
          &ldquo;{guest.teaser}&rdquo;
        </p>
      )}
    </article>
  );
}
