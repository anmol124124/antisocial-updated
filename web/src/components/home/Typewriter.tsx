'use client';

import { useEffect, useState } from 'react';

const TYPE_MS = 58;
const START_DELAY_MS = 550;

/**
 * Types one line once, then leaves it humming: every few seconds its letters
 * jitter with a red glitch strip running through them (Electric), with a
 * blinking cursor. It waits for the first-visit intro to finish (html.intro), so the
 * typing is what the visitor sees right after the stone breaks.
 *
 * Until it starts, the text is hidden only while <html> has the `js` class
 * (so without JavaScript it is simply shown), and the full line always holds
 * its space so nothing below moves. With reduced motion it is just shown.
 */
export function Typewriter({ text, className = '' }: { text: string; className?: string }) {
  const [count, setCount] = useState(text.length);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStarted(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const begin = () => {
      timer = setTimeout(() => {
        setCount(0);
        setStarted(true);
      }, START_DELAY_MS);
    };
    if (document.documentElement.classList.contains('intro')) {
      window.addEventListener('ast:intro-done', begin, { once: true });
    } else {
      begin();
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener('ast:intro-done', begin);
    };
  }, []);

  useEffect(() => {
    if (!started || count >= text.length) return;
    // A little unevenness, like a person typing.
    const timer = setTimeout(() => {
      setCount((c) => c + 1);
    }, TYPE_MS + Math.random() * 40);
    return () => clearTimeout(timer);
  }, [started, count, text]);

  const shown = text.slice(0, count);
  const done = started && count >= text.length;
  return (
    <span className={`type-line grid ${className}`} data-ready={started}>
      {/* The full line holds the space, invisibly. */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {text}
        <Cursor />
      </span>
      {/* Once complete, the line hums: letters jitter and a red glitch strip runs through, in bursts. */}
      <span
        aria-hidden
        className={`type-text col-start-1 row-start-1 ${done ? 'glitch-loop' : ''}`}
        data-text={done ? text : undefined}
      >
        {done ? <Electric text={text} redFrom={text.trimEnd().lastIndexOf(' ') + 1} /> : <Accent text={shown} full={text} />}
        <Cursor blinking={count >= text.length} />
      </span>
    </span>
  );
}

/**
 * Text that hums with current: every few seconds the letters jitter in place
 * for a moment (with a faint red glow), then hold still, then again. Each
 * letter has its own small offset and timing, so it never moves as a block,
 * and no letter ever leaves its place. Letters from `redFrom` on are red.
 * CSS only ("electric" in globals.css); still with reduced motion.
 */
export function Electric({ text, redFrom }: { text: string; redFrom: number }) {
  return (
    <>
      {[...text].map((ch, i) =>
        ch === ' ' ? (
          ' '
        ) : (
          <span
            key={i}
            className={`electric ${i % 2 ? 'electric-b' : ''} ${i >= redFrom ? 'text-signal' : ''}`}
            style={{ animationDelay: `${(i % 3) * 0.03}s` }}
          >
            {ch}
          </span>
        ),
      )}
    </>
  );
}

/** The last word of the line in red, as the brand sets its titles; `text` is how much of `full` is typed so far. */
export function Accent({ text, full }: { text: string; full: string }) {
  const from = full.trimEnd().lastIndexOf(' ') + 1;
  return (
    <>
      {text.slice(0, from)}
      {text.length > from && <span className="text-signal">{text.slice(from)}</span>}
    </>
  );
}

function Cursor({ blinking = true }: { blinking?: boolean }) {
  return (
    <span
      aria-hidden
      className={`ml-[0.08em] inline-block h-[0.82em] w-[0.08em] translate-y-[0.06em] bg-signal align-baseline ${
        blinking ? 'animate-[blink_1s_steps(1)_infinite]' : ''
      }`}
    />
  );
}
