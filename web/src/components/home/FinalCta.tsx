import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

/** 08 / Final CTA (homepage brief): black, one big question and three ways to answer it. */
export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="grain relative isolate overflow-hidden bg-ink text-white">
      <Container className="relative z-10 py-24 text-center lg:py-36">
        <Reveal>
          <h2 id="final-title" className="headline text-[clamp(3rem,8.5vw,7rem)]">
            Ready to <span className="text-signal">speak up?</span>
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-[1.0625rem] leading-relaxed text-white/65">
            The next conversation could start with you.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href="/community/story" variant="solid-light" arrow>
              Tell Your Story
            </Button>
            <Button href="/community/speaker" variant="outline-light" arrow>
              Suggest a Speaker
            </Button>
            <Button href="/chapters" variant="outline-light" arrow>
              Start a Chapter
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
