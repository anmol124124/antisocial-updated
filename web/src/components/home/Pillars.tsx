import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Media } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';

const PILLARS = [
  {
    href: '/stories',
    title: 'AntiSocial Stories',
    blurb: 'Stories from people who rarely get asked.',
    cta: 'Explore Stories',
    image: '/images/pillar-stories.jpg',
    alt: 'A woman smiling mid-conversation across a podcast microphone',
  },
  {
    href: '/events',
    title: 'AntiSocial Events',
    blurb: 'Socially Unfiltered.',
    cta: 'Explore Events',
    image: '/images/pillar-events.png',
    alt: 'The AntiSocialTalks crew talking by their cars at sunset, behind an AntiSocialTalks banner',
    // Wide photo: keep the banner and the interview in the square crop.
    position: '31% 50%',
  },
  {
    href: '/shop',
    title: 'The AntiSocial Shop',
    blurb: 'Wear the conversation.',
    cta: 'Shop the Drop',
    image: '/images/pillar-shop-drop.jpg',
    alt: 'Two models in black AntiSocialTalks merch: the “Not anti-opinion. Anti-bulls*it.” tee and the “They called us antisocial. We decided to talk.” hoodie',
  },
];

/**
 * Stories, Events and the Shop, as equal-weight entry points (Chapters has its
 * own section above, with the map). Images are square to match the source
 * files, so the shirt collar is never cropped.
 */
export function Pillars() {
  return (
    <section aria-label="Explore AntiSocialTalks" className="bg-cream py-20 lg:py-28">
      <Container>
        <ul className="grid gap-5 sm:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <li key={pillar.href}>
              <Reveal delay={i * 70} className="h-full">
                <Link
                  href={pillar.href}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-ink/[0.06] transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
                >
                  <Media
                    src={pillar.image}
                    alt={pillar.alt}
                    tone={i}
                    position={'position' in pillar ? pillar.position : undefined}
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="aspect-square w-full"
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-base font-bold tracking-tight">{pillar.title}</h3>
                    <p className="mt-1.5 flex-1 text-sm text-ink-mute">{pillar.blurb}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink">
                      {pillar.cta}
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
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
