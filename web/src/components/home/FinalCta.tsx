import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-title"
      className="grain relative isolate overflow-hidden bg-ink text-white"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'linear-gradient(180deg, #f2f2f2 0%, #d8d8d8 22%, #8b8b8b 45%, #3b3b3b 72%, #0b0b0c 100%)',
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-ink/72" />

      <Container className="relative z-10 py-24 lg:py-32">
        <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <Reveal>
            <h2 id="final-title" className="display text-[clamp(2.5rem,6vw,4.5rem)]">
              Ready to <span className="font-serif font-normal italic text-sand">speak up?</span>
            </h2>
            <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-white/75">
              The next conversation could start with you.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
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
        </div>
      </Container>
    </section>
  );
}
