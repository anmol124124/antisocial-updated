import Image from 'next/image';
import Link from 'next/link';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { assetUrl } from '@/lib/directus';
import type { PersonCard } from '@/lib/chapters';

/** First letters of a name for the round badge: "Dr. Anmol Kapoor" -> "AK", "Jessica" -> "J". */
function initials(name: string): string {
  const words = name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * "The People Behind It": one card each, with their photo (or a company's
 * logo, or their initials), role, name, title, a line about them and a link
 * to their profile or site.
 */
export function EventPeople({ people }: { people: PersonCard[] }) {
  if (!people.length) return null;
  return (
    <div className="mt-14">
      <Reveal>
        <Eyebrow>The People Behind It</Eyebrow>
      </Reveal>
      <ul className={`grid gap-6 sm:grid-cols-2 ${people.length > 2 ? 'lg:grid-cols-3' : ''}`}>
        {people.map((p, i) => (
          <li key={`${p.role}-${p.name}`}>
            <Reveal delay={i * 60} className="h-full">
              <div className="flex h-full flex-col rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06]">
                {p.photo ? (
                  <span className="relative block h-16 w-16 overflow-hidden rounded-full bg-ink ring-1 ring-ink/10">
                    <Image src={assetUrl(p.photo, { width: 160, height: 160 })!} alt={p.name} fill sizes="64px" className="object-cover" />
                  </span>
                ) : p.logo ? (
                  <span className="inline-flex h-16 items-center self-start rounded-2xl bg-ink px-5">
                    <Image
                      src={assetUrl(p.logo, { width: 320, fit: 'contain' })!}
                      alt={`${p.name} logo`}
                      width={101}
                      height={48}
                      className="h-8 w-auto"
                    />
                  </span>
                ) : (
                  <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-ink font-serif text-xl italic text-sand">
                    {initials(p.name)}
                  </span>
                )}
                {p.role && <p className="eyebrow mt-6 text-[0.625rem] text-ink-mute">{p.role}</p>}
                <h2 className="mt-1.5 text-xl font-bold tracking-tight">{p.name}</h2>
                {p.title && <p className="mt-1 text-sm font-semibold text-sand-deep">{p.title}</p>}
                {p.bio && <p className="mt-3 text-sm leading-relaxed text-ink-mute">{p.bio}</p>}
                {p.href && (
                  <div className="mt-auto pt-5">
                    {/^https?:/.test(p.href) ? (
                      <a href={p.href} target="_blank" rel="noopener noreferrer" className="link-underline text-xs font-bold uppercase tracking-[0.16em] text-ink">
                        Visit {p.name}
                      </a>
                    ) : (
                      <Link href={p.href} className="link-underline text-xs font-bold uppercase tracking-[0.16em] text-ink">
                        {p.href.startsWith('/voices/') ? 'See Profile' : 'Meet the Hosts'}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}
