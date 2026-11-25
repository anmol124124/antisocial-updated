import Link from 'next/link';
import { Media, initials } from '@/components/ui/Media';
import { InstagramIcon } from '@/components/ui/SocialIcons';
import { assetUrl } from '@/lib/directus';
import { slugify, type Guest } from '@/lib/content';

/**
 * One voice on the Meet the Voices page, magazine-style: portrait on one side,
 * name, designation, tagline and the full description on the other. Rows
 * alternate sides on desktop (`flip`) so a long list doesn't read as a table;
 * on phones everything stacks, photo first.
 *
 * The compact GuestCard is still what the home page and "More voices" use —
 * the descriptions are too long for a grid card.
 */
export function VoiceRow({ guest, index, flip = false }: { guest: Guest; index: number; flip?: boolean }) {
  const slug = slugify(guest.name);

  return (
    <article className="group grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <Link
        href={`/voices/${slug}`}
        aria-label={`${guest.name}, full profile`}
        className={`relative block overflow-hidden rounded-[1.75rem] ${flip ? 'lg:order-2' : ''}`}
      >
        <Media
          src={assetUrl(guest.photo, { width: 900, height: 1125 })}
          alt={`Portrait of ${guest.name}`}
          fallbackLabel={initials(guest.name)}
          tone={index}
          sizes="(max-width: 1023px) 100vw, 50vw"
          className="aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/5]"
        />
        {guest.paired_with_label && (
          <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
            {guest.paired_with_label}
          </span>
        )}
      </Link>

      <div className="max-w-xl">
        <span className="font-serif text-2xl italic text-sand-deep">{String(index + 1).padStart(2, '0')}</span>

        <h2 className="mt-3 flex items-center gap-3 text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-tight tracking-tight">
          <Link href={`/voices/${slug}`} className="link-underline">
            {guest.name}
          </Link>
          {guest.instagram_url && (
            <a
              href={guest.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${guest.name} on Instagram`}
              className="text-ink-mute transition-colors hover:text-sand-deep"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          )}
        </h2>

        {guest.designation && (
          <p className="eyebrow mt-3 text-ink-mute">{guest.designation}</p>
        )}

        {guest.teaser && (
          <blockquote className="mt-6 border-l-2 border-sand pl-5 font-serif text-[clamp(1.25rem,2vw,1.5rem)] italic leading-snug text-ink">
            &ldquo;{guest.teaser}&rdquo;
          </blockquote>
        )}

        {guest.bio && (
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink-mute">{guest.bio}</p>
        )}

        <Link
          href={`/voices/${slug}`}
          className="mt-7 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink"
        >
          Hear {firstName(guest.name)} Out
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
        </Link>
      </div>
    </article>
  );
}

/** "Dr. Anmol Kapoor" -> "Anmol"; "Gauri G" -> "Gauri". */
function firstName(name: string): string {
  const parts = name.split(/\s+/).filter((p) => !/^(dr|mr|mrs|ms)\.?$/i.test(p));
  return parts[0] || name;
}
