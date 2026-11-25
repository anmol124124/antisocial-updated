import type { ReactNode } from 'react';

export function Eyebrow({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <p
      className={`eyebrow mb-4 flex items-center gap-2.5 ${
        tone === 'light' ? 'text-white/65' : 'text-ink-mute'
      }`}
    >
      <span
        aria-hidden
        className="inline-block h-px w-6 bg-sand"
      />
      {children}
    </p>
  );
}
