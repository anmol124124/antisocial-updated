import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { runOrderJobs } from '@/lib/order-ops';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/orders
 *
 * Shipping emails, team-requested cancels and refunds, and unfinished
 * checkouts (see lib/order-ops). Called every few minutes by the server's
 * crontab with `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || '';
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });

  const report = await runOrderJobs();
  return NextResponse.json({ ok: true, at: new Date().toISOString(), report });
}
