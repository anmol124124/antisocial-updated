import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta';
import { ApplicationPage } from '@/components/chapters/ApplicationPage';
import { APPLICATIONS } from '@/lib/chapters';
import { FOUNDER_QUESTIONS, FOUNDER_STEPS, FOUNDER_STEPS_NOTE } from '@/lib/chapter-content';

export const metadata: Metadata = {
  title: 'Start a Chapter',
  description: metaDescription(APPLICATIONS.chapter_founder.lede),
  alternates: { canonical: '/chapters/start' },
};

/** Start a Chapter: the expression-of-interest form, with what happens after it. */
export default function StartChapterPage() {
  return (
    <ApplicationPage
      type="chapter_founder"
      aside={
        <aside className="rounded-[1.75rem] bg-ink p-8 text-white lg:sticky lg:top-28">
          <p className="eyebrow text-white/55">Five questions</p>
          <dl className="mt-5 space-y-3">
            {FOUNDER_QUESTIONS.map((q) => (
              <div key={q.label} className="flex gap-3 text-sm">
                <dt className="w-14 shrink-0 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-sand/80">{q.label}</dt>
                <dd className="text-white/75">{q.body}</dd>
              </div>
            ))}
          </dl>

          <p className="eyebrow mt-10 text-white/55">Six steps to launch</p>
          <ol className="mt-5 space-y-3">
            {FOUNDER_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="w-6 shrink-0 font-serif italic text-sand/80">{String(i + 1).padStart(2, '0')}</span>
                <span className={i === 0 ? 'font-bold text-white' : 'text-white/75'}>
                  {step}
                  {i === 0 && <span className="ml-2 text-xs font-normal text-sand">(this form)</span>}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">{FOUNDER_STEPS_NOTE}</p>
        </aside>
      }
    />
  );
}
