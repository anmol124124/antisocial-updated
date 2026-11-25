import 'server-only';
import type { ShippingAddress } from './gelato';
import type { QikinkItem } from './qikink';
import { insertItem, queryItems, updateItem } from './directus';
import { sendMail, teamInbox } from './mailer';
import { siteUrl } from './env';
import {
  createCheckoutSession,
  paymentIntentOf,
  retrieveCheckoutSession,
  stripeIsConfigured,
  stripeTestMode,
  toMinor,
} from './stripe';
import { placePrintOrder, providerOf, type Provider } from './fulfilment';

/**
 * Taking money, for both things the site sells:
 *   - shop:   merch printed by Qikink (India) or Gelato (elsewhere) once paid
 *   - ticket: a paid place at an event
 *
 * Payments go through Stripe Checkout (the selling company is in Canada).
 * Every payment has a row in the CMS `orders` collection from the moment
 * checkout opens, so a payment can always be traced, even if the visitor
 * closes the tab before coming back to the site.
 */

export type CartLine = {
  /** Slug of the shop_products row in Directus. */
  slug: string;
  title: string;
  gelatoProductUid: string;
  printFileUrl: string | null;
  /** One file per placement (front, back, sleeve-left...). Wins over printFileUrl. */
  printFiles?: { type: string; url: string }[];
  quantity: number;
  /** Retail price in major units (e.g. 34.00), as shown to the customer. */
  unitPrice: number;
  /** India only: the Qikink product, worked out when the cart was priced. */
  qikink?: QikinkItem;
};

export type OrderKind = 'shop' | 'ticket';

export type OrderStatus =
  | 'pending'
  | 'abandoned'
  | 'paid'
  | 'fulfilled'
  | 'shipped'
  | 'delivered'
  | 'fulfilment_failed'
  | 'cancel_requested'
  | 'cancel_failed'
  | 'refund_requested'
  | 'refund_failed'
  | 'refunded'
  | 'cancelled';

export type OrderRow = {
  id: number;
  kind: OrderKind;
  status: OrderStatus;
  amount: number;
  amount_minor: number;
  currency: string;
  customer_name: string;
  email: string;
  phone: string | null;
  description: string;
  lines: CartLine[] | null;
  shipping_address: ShippingAddress | null;
  shipment_method_uid: string | null;
  registration: number | null;
  stripe_session_id?: string | null;
  stripe_payment_intent?: string | null;
  fulfilment_provider?: Provider | null;
  gelato_order_id?: string | null;
  gelato_status?: string | null;
  qikink_order_id?: string | null;
  qikink_status?: string | null;
  shipped_notified?: boolean | null;
  /** Paid with live Stripe keys (real money). Empty or false: Stripe test mode, i.e. staging. */
  livemode?: boolean | null;
  date_created?: string;
};

export function paymentsAreConfigured(): boolean {
  return process.env.PAYMENT_GATEWAY === 'stripe' && stripeIsConfigured();
}

export type PaymentLine = { name: string; unitPrice: number; quantity: number };

/**
 * Record the order in the CMS, then open a Stripe Checkout page for exactly
 * these lines. The visitor is sent to `url`; Stripe brings them back to
 * /payment/complete, or to `returnTo` if they cancel.
 */
export async function startPayment(input: {
  kind: OrderKind;
  currency: string;
  lines: PaymentLine[];
  customer: { name: string; email: string; phone?: string };
  description: string;
  /** Path to come back to on cancel, e.g. "/checkout". */
  returnTo: string;
  /** How long the payment page stays open (Stripe allows 30 minutes to 24 hours). */
  expiresInMinutes?: number;
  extra?: Record<string, unknown>;
}): Promise<{ url: string }> {
  const currency = input.currency.toUpperCase();
  const lines = input.lines
    .filter((l) => l.quantity > 0 && l.unitPrice > 0)
    .map((l) => ({ name: l.name, quantity: l.quantity, unitAmountMinor: toMinor(l.unitPrice, currency) }));
  if (!lines.length) throw new Error('Nothing to pay for.');
  const amountMinor = lines.reduce((sum, l) => sum + l.unitAmountMinor * l.quantity, 0);
  const amount = Math.round(input.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100;

  const rowId = await insertItem('orders', {
    kind: input.kind,
    status: 'pending',
    amount,
    amount_minor: amountMinor,
    currency,
    customer_name: input.customer.name,
    email: input.customer.email,
    phone: input.customer.phone || null,
    description: input.description,
    // Staging and the live site share one CMS; each site's order job only touches its own mode.
    livemode: !stripeTestMode(),
    ...input.extra,
  });

  const session = await createCheckoutSession({
    reference: `AST-${rowId}`,
    orderId: rowId,
    kind: input.kind,
    currency,
    lines,
    customerEmail: input.customer.email,
    description: input.description,
    successUrl: `${siteUrl()}/payment/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${siteUrl()}${input.returnTo}`,
    expiresInMinutes: input.expiresInMinutes ?? 60,
  });
  await updateItem('orders', rowId, { stripe_session_id: session.id });
  if (!session.url) throw new Error(`Stripe opened checkout ${session.id} without a payment page.`);
  return { url: session.url };
}

export type Settlement = { state: 'paid' | 'pending' | 'unpaid'; kind: OrderKind; message: string };

/** Stripe knows the payment but the CMS has no order for it (another integration on the same account). */
export class UnknownOrderError extends Error {}

const MESSAGES: Record<OrderKind, string> = {
  shop: 'Payment received. Your order is going to print, and we’ll email you when it ships.',
  ticket: 'Payment received. Your place is booked, and the details are in your email.',
};

// The browser and the webhook usually report the same payment within a second
// of each other. One settlement per checkout at a time, so a print order is
// never placed twice. (The site runs as one process under pm2.)
const inflight = new Map<string, Promise<Settlement>>();

/** Confirm a payment with Stripe and deliver what was bought. Safe to call repeatedly. */
export function settlePayment(sessionId: string): Promise<Settlement> {
  const running = inflight.get(sessionId);
  if (running) return running;
  const job = settle(sessionId).finally(() => inflight.delete(sessionId));
  inflight.set(sessionId, job);
  return job;
}

async function settle(sessionId: string): Promise<Settlement> {
  const [order] = await queryItems<OrderRow>('orders', {
    filter: JSON.stringify({ stripe_session_id: { _eq: sessionId } }),
    fields: '*',
    limit: '1',
  });
  if (!order) throw new UnknownOrderError(`No order recorded for Stripe checkout ${sessionId}.`);

  if (order.status !== 'pending' && order.status !== 'abandoned') {
    return { state: 'paid', kind: order.kind, message: MESSAGES[order.kind] };
  }

  // Never trust the browser's word for it: ask Stripe.
  const session = await retrieveCheckoutSession(sessionId);
  if (session.client_reference_id && session.client_reference_id !== `AST-${order.id}`) {
    throw new Error(`Checkout ${sessionId} belongs to a different order.`);
  }
  if (session.payment_status !== 'paid') {
    return session.status === 'complete'
      ? { state: 'pending', kind: order.kind, message: 'Your payment is still processing. We’ll email you as soon as it clears.' }
      : { state: 'unpaid', kind: order.kind, message: 'The payment wasn’t completed, so nothing was charged.' };
  }
  if (session.amount_total !== order.amount_minor || (session.currency || '').toUpperCase() !== order.currency) {
    throw new Error(`Checkout ${sessionId} amount does not match order ${order.id}.`);
  }

  await updateItem('orders', order.id, {
    status: 'paid',
    stripe_payment_intent: paymentIntentOf(session),
    date_paid: new Date().toISOString(),
  });

  if (order.kind === 'ticket') await deliverTicket(order);
  else await deliverShopOrder(order);

  return { state: 'paid', kind: order.kind, message: MESSAGES[order.kind] };
}

async function deliverTicket(order: OrderRow) {
  if (order.registration) {
    await updateItem('event_registrations', order.registration, { status: 'confirmed', payment_status: 'paid' });
  }
  const amount = money(order.amount, order.currency);
  await Promise.all([
    sendMail({
      to: order.email,
      subject: `Booking confirmed: ${order.description}`,
      text:
        `Hi ${order.customer_name},\n\nYour place is booked.\n\n${order.description}\nPaid: ${amount}\n` +
        `Reference: AST-${order.id}\n\nWe’ll email the venue and timings closer to the date.\n\nThe AntiSocialTalks team`,
    }),
    notifyTeam(`Paid booking: ${order.description}`, order, amount),
  ]);
}

const PRINTER: Record<Provider, string> = { gelato: 'Gelato', qikink: 'Qikink' };

async function deliverShopOrder(order: OrderRow) {
  const amount = money(order.amount, order.currency);
  const reference = `AST-${order.id}`;
  const printer = PRINTER[providerOf(order)];
  let failure = '';

  try {
    const placed = await placePrintOrder(order, stripeTestMode());
    await updateItem('orders', order.id, {
      status: 'fulfilled',
      fulfilment_provider: placed.provider,
      ...(placed.provider === 'qikink' ? { qikink_order_id: placed.id } : { gelato_order_id: placed.id }),
      ...(placed.note ? { notes: placed.note } : {}),
    });
  } catch (err) {
    // The customer has paid, so this must reach a person. It is not retried
    // automatically: a retry after a timeout could print the order twice.
    failure = err instanceof Error ? err.message : String(err);
    console.error(`[payments] ${printer.toUpperCase()} ORDER FAILED AFTER PAYMENT for ${reference}:`, failure);
    await updateItem('orders', order.id, { status: 'fulfilment_failed', notes: failure.slice(0, 2000) }).catch(() => {});
  }

  const items = (order.lines || []).map((l) => `${l.quantity} × ${l.title}`).join('\n');
  await Promise.all([
    sendMail({
      to: order.email,
      subject: `Order received: ${reference}`,
      text:
        `Hi ${order.customer_name},\n\nThanks for your order. Payment of ${amount} is received.\n\n${items}\n\n` +
        `Everything is printed to order, so it usually ships within a few working days. We’ll email you when it does.\n\nThe AntiSocialTalks team`,
    }),
    notifyTeam(
      failure ? `ACTION NEEDED: paid order ${reference} was not sent to ${printer}` : `Paid shop order ${reference}`,
      order,
      amount,
      failure ? `\n${printer} error: ${failure}\nPlace this order by hand in the ${printer} dashboard.` : '',
    ),
  ]);
}

export function notifyTeam(subject: string, order: OrderRow, amount: string, extra = '') {
  const inbox = teamInbox();
  if (!inbox) return Promise.resolve(false);
  return sendMail({
    to: inbox,
    replyTo: order.email,
    subject,
    text:
      `${order.description}\nAmount: ${amount}\nCustomer: ${order.customer_name} <${order.email}>` +
      `${order.phone ? `\nPhone: ${order.phone}` : ''}\nOrder in CMS: #${order.id}${extra}`,
  });
}

export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
