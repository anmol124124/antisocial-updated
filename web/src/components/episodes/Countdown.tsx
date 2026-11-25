'use client';

import { useEffect, useState } from 'react';

const UNITS = [
  { label: 'Days', short: 'Days', ms: 86_400_000 },
  { label: 'Hours', short: 'Hrs', ms: 3_600_000 },
  { label: 'Minutes', short: 'Min', ms: 60_000 },
  { label: 'Seconds', short: 'Sec', ms: 1_000 },
] as const;

function split(remaining: number): number[] {
  let rest = Math.max(0, remaining);
  return UNITS.map(({ ms }) => {
    const value = Math.floor(rest / ms);
    rest -= value * ms;
    return value;
  });
}

/**
 * Ticking countdown to an ISO date. Renders dashes until it mounts, so the
 * server-rendered HTML and the first client render agree (the server's clock
 * and the visitor's differ by however long the page sat in the ISR cache).
 */
export function Countdown({ target, variant = 'boxes' }: { target: string; variant?: 'boxes' | 'inline' }) {
  const end = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const values = now === null ? null : split(end - now);
  const done = now !== null && end - now <= 0;

  // A single row on a dark background, the seconds in the accent.
  if (variant === 'inline') {
    return (
      <dl className="flex items-end gap-4 sm:gap-6" aria-live="off">
        {UNITS.map((unit, i) => (
          <div key={unit.label} className="flex min-w-[2.75rem] flex-col-reverse items-center">
            <dt className="eyebrow mt-1.5 text-[0.5625rem] text-white/50">{unit.short}</dt>
            <dd className={`text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-none tracking-tight tabular-nums ${i === UNITS.length - 1 ? 'text-sand' : 'text-white'}`}>
              {values ? String(values[i]).padStart(2, '0') : '––'}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div>
      <dl className="grid max-w-md grid-cols-4 gap-2" aria-live="off">
        {UNITS.map((unit, i) => (
          // <dt> before <dd> for valid markup; column-reverse puts the number on top.
          <div key={unit.label} className="flex flex-col-reverse rounded-2xl bg-ink px-2 py-4 text-center text-white">
            <dt className="eyebrow mt-2 text-[0.5625rem] text-white/55">{unit.label}</dt>
            <dd className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] italic leading-none tabular-nums">
              {values ? String(values[i]).padStart(2, '0') : '––'}
            </dd>
          </div>
        ))}
      </dl>
      {done && <p className="mt-4 text-sm font-semibold text-ink">Dropping any minute.</p>}
    </div>
  );
}
