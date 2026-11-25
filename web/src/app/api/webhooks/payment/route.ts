import { NextResponse } from 'next/server';
import { UnknownOrderError, paymentsAreConfigured, settlePayment } from '@/lib/payments';
import { webhookSignatureIsValid } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = { type?: string; data?: { object?: { id?: string; object?: string } } };

const SETTLES = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

/**
 * POST /api/webhooks/payment  (Stripe webhook)
 *
 * The safety net for visitors who close the tab before coming back from
 * Stripe: the order is still settled and delivered. Settling twice is harmless.
 */
export async function POST(request: Request) {
  if (!paymentsAreConfigured()) {
    return NextResponse.json({ error: 'No payment gateway configured.' }, { status: 501 });
  }

  // The signature covers the exact bytes, so read the body as text first.
  const rawBody = await request.text();
  if (!webhookSignatureIsValid(rawBody, request.headers.get('stripe-signature'))) {
    console.error('[webhooks/payment] bad signature (check STRIPE_WEBHOOK_SECRET)');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  const session = event.data?.object;
  if (!SETTLES.includes(event.type || '') || session?.object !== 'checkout.session' || !session.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await settlePayment(session.id);
    return NextResponse.json({ ok: true, state: result.state });
  } catch (err) {
    // Not one of the site's orders: retrying won't change that, and a webhook
    // that keeps failing is switched off by Stripe.
    if (err instanceof UnknownOrderError) return NextResponse.json({ ok: true, ignored: true });
    // A 5xx makes Stripe retry later, which is what we want here.
    console.error('[webhooks/payment]', err);
    return NextResponse.json({ error: 'Could not settle.' }, { status: 500 });
  }
}
