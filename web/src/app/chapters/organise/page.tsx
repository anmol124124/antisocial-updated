import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta';
import { ApplicationPage } from '@/components/chapters/ApplicationPage';
import { APPLICATIONS } from '@/lib/chapters';
import { getChapterGuide } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Create Your Own Event with AntiSocial',
  description: metaDescription(APPLICATIONS.organiser.lede),
  alternates: { canonical: '/chapters/organise' },
};

export default async function OrganisePage() {
  const { organisingSteps } = await getChapterGuide();
  return (
    <ApplicationPage
      type="organiser"
      aside={
        <aside className="rounded-[1.75rem] bg-ink p-8 text-white lg:sticky lg:top-28">
          <p className="eyebrow text-white/55">What happens next</p>
          <ol className="mt-6 space-y-6">
            {organisingSteps.map(({ title, body }, i) => (
              <li key={title} className="flex gap-4">
                <span className="font-serif text-xl italic text-sand/80">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/60">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">
            Submitting a proposal doesn’t publish an event or grant permission to use the AntiSocialTalks
            brand. Every proposal is reviewed by our team first.
          </p>
        </aside>
      }
    />
  );
}
