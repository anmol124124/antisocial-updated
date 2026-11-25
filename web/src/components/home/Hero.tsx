import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { SocialIcon, SocialIconLink } from '@/components/ui/SocialIcons';
import { SOCIAL_LINKS } from '@/components/site/nav';

/**
 * The original static site's hero, brought back: a black-and-white portrait
 * bleeding off the right edge behind the copy, faded into the black from the
 * left so the headline stays readable over it, with "Say what you've never
 * said!!" handwritten on the photo. On phones and tablets the
 * portrait drops below the copy instead.
 *
 * The portrait is a fixed brand asset in public/images, not CMS content.
 */
const HERO_IMAGE = '/images/hero-portrait.jpg';
const HERO_ALT = 'Black-and-white portrait of a woman looking into the distance';

// Same fades as the original site, in the brand black (#0b0b0c).
const DESKTOP_FADE =
  'linear-gradient(90deg, #0b0b0c 0%, rgba(11,11,12,.9) 12%, rgba(11,11,12,.15) 40%, rgba(11,11,12,0) 55%),' +
  'linear-gradient(180deg, rgba(11,11,12,0) 70%, #0b0b0c 100%)';
const MOBILE_FADE =
  'linear-gradient(180deg, #0b0b0c 0%, rgba(11,11,12,.15) 35%, rgba(11,11,12,0) 60%, rgba(11,11,12,.85) 100%)';

/** The handwritten line on the portrait — where the old site's script text sat. */
function PhotoLine({ className = '' }: { className?: string }) {
  return (
    <p className={`font-hand leading-[1.1] text-sand-light drop-shadow-[0_2px_12px_rgba(0,0,0,.6)] ${className}`}>
      <span className="block">Say what you’ve</span>
      <span className="block pl-[0.7em]">never said!!</span>
    </p>
  );
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grain relative isolate overflow-hidden bg-ink text-white"
    >
      {/* Desktop: the portrait fills everything right of 40%, behind the copy. */}
      <div className="pointer-events-none absolute inset-y-0 left-[40%] right-0 hidden lg:block">
        <Image src={HERO_IMAGE} alt={HERO_ALT} fill priority sizes="60vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0" style={{ background: DESKTOP_FADE }} />
        <PhotoLine className="absolute right-[clamp(20px,6vw,90px)] top-1/2 -translate-y-[40%] -rotate-6 text-[clamp(2rem,3.4vw,2.875rem)]" />
      </div>

      <Container className="relative z-10">
        <div className="flex items-center pt-16 pb-12 lg:min-h-[38rem] lg:py-24">
          <div className="w-full max-w-[36rem] lg:w-[56%]">
            <Reveal>
              <p className="eyebrow mb-6 flex items-center gap-2.5 text-white/60">
                <span aria-hidden className="inline-block h-px w-8 bg-sand" />
                The Conversation Platform
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1
                id="hero-title"
                className="display text-[clamp(2.25rem,11vw,2.75rem)] sm:text-[clamp(2.75rem,7.5vw,5.25rem)]"
              >
                {/* Non-breaking spaces keep "us" and "talk." from dropping onto lines of their own. */}
                They called&nbsp;us
                <br />
                AntiSocial.
                <br />
                <span className="font-serif font-normal italic text-sand">We decided to&nbsp;talk.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              {/* The introduction, in the client's words (homepage brief, section 02). */}
              <div className="mt-8 max-w-xl space-y-3 text-[0.9375rem] leading-relaxed text-white/70">
                <p>
                  AntiSocial Talks is a global conversation and media platform exploring people, ideas
                  and stories that challenge conventional thinking.
                </p>
                <p>
                  We bring together innovators, creators, leaders and everyday people for honest
                  conversations about the issues shaping our lives and our future.
                </p>
                <p>
                  Through global chapters and live events, we take those conversations beyond the
                  screen and into communities around the world.
                </p>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <p className="mt-7 font-hand text-[1.75rem] leading-none text-sand">
                Not anti-society. Anti-silence.
              </p>
            </Reveal>

            <Reveal delay={280}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button href="/episodes" variant="solid-light">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-3 w-3">
                    <path d="M6 4l14 8-14 8z" />
                  </svg>
                  Listen Now
                </Button>
                <Button href="/chapters" variant="outline-light" arrow>
                  Start a Chapter
                </Button>
                <div className="flex flex-wrap gap-3">
                  {SOCIAL_LINKS.map((s) => (
                    <SocialIconLink key={s.key} href={s.href} label={`AntiSocialTalks on ${s.label}`}>
                      <SocialIcon name={s.key} className="h-[1.125rem] w-[1.125rem]" />
                    </SocialIconLink>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>

      {/* Phones and tablets: the portrait sits under the copy, edge to edge. */}
      <div className="relative aspect-[1/1.05] max-h-[32rem] w-full lg:hidden">
        <Image
          src={HERO_IMAGE}
          alt={HERO_ALT}
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
        <div aria-hidden className="absolute inset-0" style={{ background: MOBILE_FADE }} />
        <PhotoLine className="absolute bottom-7 right-5 -rotate-[5deg] text-[clamp(1.75rem,8vw,2.375rem)] sm:right-8" />
      </div>

      <TopicMarquee />
    </section>
  );
}

const MARQUEE_WORDS = [
  'Human',
  'Health',
  'Science',
  'Technology',
  'Business',
  'Society',
  'The Future',
  'Identity',
  'Money',
  'Belief',
];

/** Thin scrolling band of the things we talk about, closing off the hero. */
function TopicMarquee() {
  const words = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/[0.03] py-3.5">
      <div className="flex w-max animate-marquee items-center gap-10 motion-reduce:animate-none">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            // The second copy exists only so the loop has no seam: screen
            // readers skip it, and with reduced motion it isn't shown at all.
            aria-hidden={i >= MARQUEE_WORDS.length || undefined}
            className={`flex shrink-0 items-center gap-10 text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-white/35 ${
              i >= MARQUEE_WORDS.length ? 'motion-reduce:hidden' : ''
            }`}
          >
            {word}
            <span aria-hidden className="h-1 w-1 rounded-full bg-sand/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
