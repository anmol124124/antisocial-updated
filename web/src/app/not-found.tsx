import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <section className="grain relative isolate flex min-h-[70vh] items-center overflow-hidden bg-ink text-white">
      <Container className="relative z-10 py-20 text-center">
        <p className="font-serif text-[clamp(4rem,14vw,9rem)] italic leading-none text-sand">404</p>
        <h1 className="display mt-4 text-[clamp(1.75rem,4vw,2.75rem)]">
          Page not found.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[0.9375rem] text-white/65">
          This page doesn’t exist, or it has moved.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button href="/" variant="solid-light" arrow>
            Back home
          </Button>
          <Button href="/episodes" variant="outline-light" arrow>
            Browse episodes
          </Button>
        </div>
      </Container>
    </section>
  );
}
