'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/**
 * Fades + lifts its children into view once, the first time they cross the
 * viewport. Falls back to visible-immediately when IntersectionObserver is
 * missing, and the CSS disables the motion entirely under
 * prefers-reduced-motion.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Tells the failsafe in layout.tsx that hydration happened, so it leaves
    // the hide-until-revealed styling alone.
    (window as Window & { __astRevealReady?: boolean }).__astRevealReady = true;

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.shown = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.shown = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown="false"
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
