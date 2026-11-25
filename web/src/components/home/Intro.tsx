import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

/**
 * 02 / Introduction (homepage brief): directly below the hero, black. The text
 * comes from the CMS (Home page → Introduction); the first paragraph is set as
 * the lead, the others beside it.
 */
export function Intro({ paragraphs }: { paragraphs: string[] }) {
  if (!paragraphs.length) return null;
  const [lead, ...rest] = paragraphs;
  return (
    <section aria-label="About AntiSocial Talks" className="border-t border-white/10 bg-ink text-white">
      <Container className="py-20 sm:py-24 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
          <Reveal>
            <p className="kicker mb-8 text-white/55">AntiSocial Talks</p>
            <p className="font-display text-[clamp(1.6rem,3.2vw,2.6rem)] font-bold leading-[1.12] tracking-[-0.025em]">
              {lead}
            </p>
          </Reveal>
          {rest.length > 0 && (
            <Reveal delay={100} className="lg:pt-16">
              <div className="space-y-6 border-l-2 border-signal pl-6 text-[1.0625rem] leading-relaxed text-white/70">
                {rest.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}
