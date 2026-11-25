import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { LegalDocument } from '@/lib/legal';

/** "**bold**", email addresses and web addresses (ours, the regulators'), as React nodes. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).flatMap((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return [<strong key={i}>{part.slice(2, -2)}</strong>];
    return part.split(/([\w.+-]+@antisocialtalks\.com|www\.[\w-]+(?:\.[\w-]+)+)/g).map((bit, j) => {
      if (bit.includes('@')) {
        return (
          <a key={`${i}-${j}`} href={`mailto:${bit}`} className="link-underline font-semibold text-ink">
            {bit}
          </a>
        );
      }
      if (bit === 'www.antisocialtalks.com') {
        return (
          <a key={`${i}-${j}`} href="https://antisocialtalks.com" className="link-underline font-semibold text-ink">
            {bit}
          </a>
        );
      }
      if (bit.startsWith('www.')) {
        return (
          <a key={`${i}-${j}`} href={`https://${bit}`} target="_blank" rel="noopener noreferrer" className="link-underline font-semibold text-ink">
            {bit}
          </a>
        );
      }
      return bit;
    });
  });
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Long-form legal text: a contents list, then numbered clauses with anchors
 * (the text cites them by number), set for reading (narrow measure, generous
 * leading). Lettered lists keep the a), b) of the source.
 */
export function LegalPage({ doc, eyebrow, notice }: { doc: LegalDocument; eyebrow: string; notice?: ReactNode }) {
  // Short documents don't need a contents list, and then the text takes the full row.
  const withContents = doc.sections.length > 2;
  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-ink text-white">
        <Container className="relative z-10 py-14 lg:py-20">
          <Eyebrow tone="light">{eyebrow}</Eyebrow>
          <h1 className="display max-w-3xl text-[clamp(2rem,5vw,3.25rem)]">{doc.title}</h1>
          <p className="mt-5 text-sm text-white/60">{doc.dates}</p>
        </Container>
      </section>

      <section className="bg-cream py-14 lg:py-20">
        <Container>
          <div className={withContents ? 'grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16' : ''}>
            {withContents && (
              <nav aria-label="Contents" className="lg:sticky lg:top-28 lg:self-start">
                <p className="eyebrow mb-4 text-ink-mute">Contents</p>
                <ol className="space-y-2 text-sm">
                  {doc.sections.map((s, n) => (
                    <li key={s.heading}>
                      <a href={`#${slug(s.heading)}`} className="flex gap-2 text-ink-mute transition-colors hover:text-ink">
                        <span className="w-5 shrink-0 tabular-nums text-sand-deep">{n + 1}</span>
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <article className="max-w-[68ch] min-w-0">
              {notice && (
                <div className="mb-10 rounded-2xl border border-sand/40 bg-sand/10 px-5 py-4 text-sm leading-relaxed text-ink">
                  {notice}
                </div>
              )}
              {doc.sections.map((s, n) => (
                <section key={s.heading} id={slug(s.heading)} className="scroll-mt-28 border-t border-ink/10 py-8 first:border-t-0 first:pt-0">
                  <h2 className="mb-4 font-serif text-[1.5rem] leading-snug text-ink">
                    <span className="mr-3 tabular-nums text-sand-deep">{n + 1}</span>
                    {s.heading}
                  </h2>
                  <div className="space-y-4 text-[0.9375rem] leading-relaxed text-ink-mute">
                    {s.blocks.map((b, i) =>
                      'p' in b ? (
                        <p key={i}>{rich(b.p)}</p>
                      ) : 'ol' in b ? (
                        <ol key={i} className="space-y-2">
                          {b.ol.map((item, j) => (
                            <li key={j} className="grid grid-cols-[1.75rem_minmax(0,1fr)]">
                              <span className="text-sand-deep">{String.fromCharCode(97 + j)})</span>
                              <span>{rich(item)}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <ul key={i} className="list-disc space-y-2 pl-5 marker:text-sand-deep">
                          {b.ul.map((item, j) => (
                            <li key={j}>{rich(item)}</li>
                          ))}
                        </ul>
                      ),
                    )}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}
