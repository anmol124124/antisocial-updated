import type { ReactNode } from 'react';

/**
 * Shown wherever a Directus collection came back empty. Deliberately explicit
 * about *where* to add the content, because with a CMS-only content model an
 * empty section is almost always "nobody has added a row yet".
 */
export function EmptyState({
  title,
  hint,
  action,
  tone = 'dark',
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  tone?: 'dark' | 'light';
}) {
  const light = tone === 'light';
  return (
    <div
      className={`rounded-3xl border border-dashed px-8 py-14 text-center ${
        light ? 'border-white/20 bg-white/[0.03]' : 'border-ink/15 bg-ink/[0.02]'
      }`}
    >
      <p className={`text-lg font-semibold ${light ? 'text-white' : 'text-ink'}`}>{title}</p>
      {hint && (
        <p className={`mx-auto mt-2 max-w-md text-sm ${light ? 'text-white/60' : 'text-ink-mute'}`}>
          {hint}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
