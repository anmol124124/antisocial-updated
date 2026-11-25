import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { Media } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';

/**
 * The signature question every guest is asked. Treated as the visual centre of
 * the page: an oversized serif pull-quote beside one square image.
 *
 * The image has its own words baked into the lower-left corner, so it is kept
 * square — the same shape as the file — and never cropped.
 */
export function TheQuestion() {
  return (
    <section aria-labelledby="question-title" className="bg-cream-deep py-20 lg:py-28">
      <Container>
        <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_1fr_0.85fr] lg:gap-10">
          <Reveal className="flex flex-col justify-center">
            <Eyebrow>The AntiSocial Question</Eyebrow>
            <h2 id="question-title" className="display text-[clamp(1.75rem,3.2vw,2.5rem)]">
              What is something you believe that most people don’t?
            </h2>
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-relaxed text-ink-mute">
              One question. No script after that. Real and raw. The answer is never the
              interesting part. It’s the story behind it.
            </p>
            <div className="mt-8">
              <Button href="/episodes" variant="solid-dark" arrow>
                Explore Episodes
              </Button>
            </div>
          </Reveal>

          <Reveal delay={100} className="group">
            <Media
              src="/images/question-say-what-others-wont.jpg"
              alt="A woman listening at a podcast microphone, with the words: Say what others won’t."
              sizes="(max-width: 1023px) 100vw, 33vw"
              className="aspect-square w-full rounded-[1.75rem]"
            />
          </Reveal>

          <Reveal delay={180}>
            <figure className="flex h-full flex-col justify-between rounded-[1.75rem] bg-ink p-8 text-white">
              {/* The heading already asks the main question, so this card asks the
                  second one instead of repeating it. */}
              <Eyebrow tone="light">The Follow-Up</Eyebrow>
              <blockquote className="my-6 font-serif text-[clamp(1.5rem,2vw,1.75rem)] font-normal italic leading-[1.2]">
                &ldquo;When were you called antisocial, and were they right?&rdquo;
              </blockquote>
              <figcaption className="border-t border-white/12 pt-5 text-sm text-white/55">
                We ask this one too.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
