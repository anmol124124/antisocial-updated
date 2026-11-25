import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe Checkout over plain HTTPS (no SDK). The visitor pays on Stripe's
 * hosted page and comes back to /payment/complete; the webhook and the order
 * job settle anything the browser didn't.
 *
 *   STRIPE_SECRET_KEY       sk_test_... on staging, sk_live_... in production
 *   STRIPE_WEBHOOK_SECRET   whsec_... from Developers -> Webhooks, for
 *                           checkout.session.completed and
 *                           checkout.session.async_payment_succeeded
 */

const API = 'https://api.stripe.com/v1';

export function stripeIsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Test keys: nothing is charged, and print orders are never real. */
export const stripeTestMode = (): boolean => (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_');

// Minor units per currency; everything the shop sells in is two-decimal.
const EXPONENT: Record<string, number> = { JPY: 0, KRW: 0, VND: 0, CLP: 0, BHD: 3, KWD: 3, OMR: 3, JOD: 3 };

export function toMinor(amount: number, currency: string): number {
  const exp = EXPONENT[currency.toUpperCase()] ?? 2;
  return Math.round(amount * 10 ** exp);
}

/** Stripe's form encoding: nested objects and arrays as a[b][0][c]=... */
function encode(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) =>
        item && typeof item === 'object' ? encode(item as Record<string, unknown>, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(item)),
      );
    } else if (typeof value === 'object') {
      encode(value as Record<string, unknown>, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

async function stripe<T>(path: string, init: { method?: 'GET' | 'POST'; params?: Record<string, unknown>; idempotencyKey?: string } = {}): Promise<T> {
  const body = init.params ? encode(init.params).toString() : undefined;
  const res = await fetch(`${API}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
    },
    body,
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) throw new Error(`Stripe ${res.status}: ${json?.error?.message || res.statusText}`);
  return json;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  status: 'open' | 'complete' | 'expired';
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
  payment_intent: string | { id: string } | null;
};

export type CheckoutLine = { name: string; unitAmountMinor: number; quantity: number };

/** A hosted payment page for one order. The reference ("AST-<id>") keys retries, so a retry never makes a second page. */
export function createCheckoutSession(input: {
  reference: string;
  orderId: number;
  kind: string;
  currency: string;
  lines: CheckoutLine[];
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  expiresInMinutes: number;
}) {
  return stripe<CheckoutSession>('/checkout/sessions', {
    method: 'POST',
    idempotencyKey: `${input.reference}-checkout`,
    params: {
      mode: 'payment',
      client_reference_id: input.reference,
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // Stripe's shortest allowed lifetime is 30 minutes.
      expires_at: Math.floor(Date.now() / 1000) + Math.max(31, input.expiresInMinutes) * 60,
      line_items: input.lines.map((l) => ({
        quantity: l.quantity,
        price_data: { currency: input.currency.toLowerCase(), unit_amount: l.unitAmountMinor, product_data: { name: l.name.slice(0, 250) } },
      })),
      metadata: { order: String(input.orderId), kind: input.kind },
      payment_intent_data: { description: input.description.slice(0, 1000), metadata: { order: String(input.orderId), kind: input.kind } },
    },
  });
}

export function retrieveCheckoutSession(sessionId: string) {
  return stripe<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`);
}

export function paymentIntentOf(session: Pick<CheckoutSession, 'payment_intent'>): string | null {
  const pi = session.payment_intent;
  return typeof pi === 'string' ? pi : pi?.id ?? null;
}

export type StripeRefund = { id: string; amount: number; status: string };

export function createRefund(paymentIntent: string, amountMinor: number, metadata: Record<string, string>) {
  return stripe<StripeRefund>('/refunds', {
    method: 'POST',
    idempotencyKey: `${metadata.order || paymentIntent}-refund`,
    params: { payment_intent: paymentIntent, amount: amountMinor, metadata },
  });
}

function sameHex(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given || '', 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The Stripe-Signature header: "t=<unix time>,v1=<hex HMAC of `${t}.${body}`>".
 * Old timestamps are refused, so a captured request can't be replayed later.
 */
export function webhookSignatureIsValid(rawBody: string, header: string | null, toleranceSeconds = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(timestamp) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some((s) => sameHex(expected, s));
}
