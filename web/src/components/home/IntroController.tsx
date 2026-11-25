'use client';

import { useCallback, useEffect } from 'react';

/** How long the intro runs (the CSS timeline in globals.css ends just before this). */
const DURATION_MS = 3000;
/** Remembered in the visitor's browser, so the intro plays only on the first visit. Read by the root layout's inline script. */
const INTRO_SEEN_KEY = 'ast-intro-seen';

/** Ends the intro after it has played, on Skip or on Escape, and remembers that it was seen. */
export function IntroController() {
  const end = useCallback(() => {
    const html = document.documentElement;
    if (!html.classList.contains('intro')) return;
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* storage blocked: it simply plays again next time */
    }
    html.classList.remove('intro');
    window.dispatchEvent(new Event('ast:intro-done'));
  }, []);

  useEffect(() => {
    if (!document.documentElement.classList.contains('intro')) return;
    // The CSS timeline started with the first paint, not when this code loaded (later on a slow
    // phone), so end it that long after the page started loading.
    const timer = setTimeout(end, Math.max(0, DURATION_MS - performance.now()));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && end();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [end]);

  return (
    <button type="button" onClick={end} className="intro-skip">
      Skip intro
    </button>
  );
}
