import { NextResponse } from 'next/server';
import { UnknownOrderError, paymentsAreConfigured, settlePayment } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/confirm  { session_id }
 *
 * Called by /payment/complete when Stripe sends the visitor back. The id only
 * says which checkout to look at: settlePayment asks Stripe whether it was
 * paid before anything is delivered.
 */
export async function POST(request: Request) {
  if (!paymentsAreConfigured()) return NextResponse.json({ error: 'Payments are not open.' }, { status: 501 });

  let body: { session_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const sessionId = String(body.session_id || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'We couldn’t find that payment.' }, { status: 400 });
  }

  try {
    const result = await settlePayment(sessionId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof UnknownOrderError) return NextResponse.json({ error: 'We couldn’t find that payment.' }, { status: 404 });
    console.error('[payments/confirm]', err);
    return NextResponse.json(
      { error: 'We couldn’t confirm the payment here just now. If it went through, you’ll get an email shortly.' },
      { status: 502 },
    );
  }
}
