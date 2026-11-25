'use client';

import { useEffect, useState } from 'react';

const TYPE_MS = 62;
const DELETE_MS = 30;
const HOLD_MS = 1900;
const GAP_MS = 380;
const GLITCH_MS = 320;

type Phase = 'hold' | 'deleting' | 'typing';

/**
 * Types each line, holds it, backspaces and types the next, on a loop, with a
 * blinking cursor and a short glitch whenever a line is complete.
 *
 * The first line is rendered in full on the server, so the page never opens
 * on an empty headline (and reads correctly without JavaScript). Every line
 * sits invisibly in the same grid cell, so the block is always as tall as the
 * longest line and nothing below it jumps. Screen readers get all the lines
 * once, as plain text. With reduced motion the lines are simply shown.
 */
export function Typewriter({ lines, className = '' }: { lines: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(lines[0]?.length ?? 0);
  const [phase, setPhase] = useState<Phase>('hold');
  const [glitch, setGlitch] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setStill(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (still || lines.length < 2) return;
    const line = lines[index] ?? '';
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'hold') {
      timer = setTimeout(() => setPhase('deleting'), HOLD_MS);
    } else if (phase === 'deleting') {
      if (count > 0) timer = setTimeout(() => setCount((c) => c - 1), DELETE_MS);
      else
        timer = setTimeout(() => {
          setIndex((i) => (i + 1) % lines.length);
          setPhase('typing');
        }, GAP_MS);
    } else if (count < line.length) {
      // A little unevenness, like a person typing.
      timer = setTimeout(() => setCount((c) => c + 1), TYPE_MS + Math.random() * 45);
    } else {
      setGlitch(true);
      timer = setTimeout(() => {
        setGlitch(false);
        setPhase('hold');
      }, GLITCH_MS);
    }
    return () => clearTimeout(timer);
  }, [phase, count, index, lines, still]);

  if (!lines.length) return null;

  if (still) {
    return (
      <span className={`block ${className}`}>
        {lines.map((line) => (
          <span key={line} className="block">
            <Accent text={line} full={line} />
          </span>
        ))}
      </span>
    );
  }

  const shown = (lines[index] ?? '').slice(0, count);

  return (
    <span className={`grid ${className}`}>
      <span className="sr-only">{lines.join(' ')}</span>
      {/* The tallest line reserves the space, invisibly. */}
      {lines.map((line) => (
        <span key={line} aria-hidden className="invisible col-start-1 row-start-1">
          {line}
          <Cursor />
        </span>
      ))}
      <span aria-hidden className="glitch col-start-1 row-start-1" data-text={shown} data-glitch={glitch}>
        <Accent text={shown} full={lines[index] ?? ''} />
        <Cursor blinking={phase === 'hold'} />
      </span>
    </span>
  );
}

/** The last word of the line in red, as the brand sets its titles; `text` is how much of `full` is typed so far. */
function Accent({ text, full }: { text: string; full: string }) {
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
      className={`ml-[0.06em] inline-block h-[0.82em] w-[0.07em] translate-y-[0.06em] bg-signal align-baseline ${
        blinking ? 'animate-[blink_1s_steps(1)_infinite]' : ''
      }`}
    />
  );
}
