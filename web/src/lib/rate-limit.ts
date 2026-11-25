import 'server-only';
import { NextResponse } from 'next/server';

/**
 * Per-visitor limits for the public POST routes (forms, quotes, checkout), so
 * a script can't flood the CMS, the team's inbox or strangers' inboxes from
 * this site's domain. Generous for people: nobody fills in a form ten times in
 * ten minutes.
 *
 * Counts live in this process's memory. The site runs as one pm2 process
 * (web/ecosystem.config.cjs), so that is every request; a restart clears them.
 */

export type Limit = { max: number; windowMs: number };

const TEN_MINUTES = 10 * 60_000;

export const LIMITS = {
  submissions: { max: 10, windowMs: TEN_MINUTES },
  // Also private-invitation RSVPs, which several guests may send from one office or venue network.
  register: { max: 20, windowMs: TEN_MINUTES },
  apply: { max: 5, windowMs: TEN_MINUTES },
  quote: { max: 40, windowMs: TEN_MINUTES },
  checkout: { max: 10, windowMs: TEN_MINUTES },
  confirm: { max: 40, windowMs: TEN_MINUTES },
  // Gelato's status callbacks: far below this in practice; stops someone looping order numbers.
  gelatoHook: { max: 120, windowMs: TEN_MINUTES },
} satisfies Record<string, Limit>;

type Bucket = keyof typeof LIMITS;

const hits = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

/**
 * The visitor's address. Behind Cloudflare, nginx sees Cloudflare's servers,
 * so Cloudflare's CF-Connecting-IP comes first; then nginx's X-Real-IP.
 */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get('cf-connecting-ip')?.trim() ||
    h.get('x-real-ip')?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Null when the request may go ahead; otherwise the 429 to send back. */
export function rateLimit(request: Request, bucket: Bucket, now = Date.now()): NextResponse | null {
  const { max, windowMs } = LIMITS[bucket];
  sweep(now);

  const key = `${bucket}:${clientIp(request)}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count <= max) return null;

  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return NextResponse.json(
    { error: 'Too many attempts. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Drop finished windows now and then, so the map never grows without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
}

/** For tests: start every count from zero. */
export function resetRateLimits() {
  hits.clear();
  lastSweep = 0;
}
