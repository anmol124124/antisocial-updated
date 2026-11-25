import 'server-only';
import { cancelOrder } from './gelato';
import { queryItems, updateItem } from './directus';
import { sendMail } from './mailer';
import { money, notifyTeam, settlePayment, type OrderRow } from './payments';
import { createRefund, retrieveCheckoutSession, stripeTestMode } from './stripe';
import { printStatus, providerOf } from './fulfilment';

/**
 * Everything that happens to an order after the payment:
 *
 *   syncShipment       the printer's status (Gelato or Qikink) -> CMS, and the
 *                      "your order has shipped" email with tracking (sent once)
 *   processRequests    the team sets an order to "Cancel and refund" or
 *                      "Refund only" in the CMS; this carries it out
 *   reconcilePending   checkouts still "Awaiting payment": settle the ones
 *                      Stripe did take money for, give up on the rest
 *
 * The cron route runs all three every few minutes; the Gelato webhook runs
 * syncShipment for one order straight away.
 */

const MINUTE = 60_000;
/** A checkout this old with no payment is given up on. */
const ABANDON_AFTER = 24 * 60 * MINUTE;
/** Leave a fresh checkout alone; the visitor may still be paying. */
const CHECK_AFTER = 15 * MINUTE;

const age = (iso?: string) => (iso ? Date.now() - new Date(iso).getTime() : 0);

/**
 * Only this site's own orders. Staging (Stripe test keys) and the live site
 * share one CMS, and a test key can't refund or look up a live payment (nor
 * the other way round), so each site leaves the other's orders alone. Orders
 * from before `livemode` existed count as test orders: the live site took no
 * payments then.
 */
const ownMode = () => (stripeTestMode() ? { _or: [{ livemode: { _eq: false } }, { livemode: { _null: true } }] } : { livemode: { _eq: true } });

const orders = (filter: object, limit = 50) =>
  queryItems<OrderRow>('orders', { filter: JSON.stringify({ _and: [filter, ownMode()] }), fields: '*', limit: String(limit), sort: 'date_created' });

const PRINTER = { gelato: 'Gelato', qikink: 'Qikink' } as const;

/* ───────────────────────────── shipping ───────────────────────────── */

/** Bring one shop order up to date with its printer. Safe to call repeatedly. */
export async function syncShipment(order: OrderRow): Promise<string> {
  if (order.kind !== 'shop') return 'skipped';
  const current = await printStatus(order);
  if (!current) return 'skipped';

  const provider = providerOf(order);
  const statusField = provider === 'qikink' ? 'qikink_status' : 'gelato_status';
  const { raw, stage, tracking } = current;
  const update: Record<string, unknown> = {};

  if (raw !== order[statusField]) update[statusField] = raw;
  if (tracking.code) update.tracking_code = tracking.code;
  if (tracking.url) update.tracking_url = tracking.url;

  const shipped = stage === 'shipped' || stage === 'delivered';
  if (shipped && order.status === 'fulfilled') {
    update.status = stage;
    update.date_shipped = current.shippedAt || new Date().toISOString();
  }
  if (stage === 'delivered' && order.status === 'shipped') update.status = 'delivered';

  // Email once, when the parcel can actually be tracked (or has already arrived).
  if (shipped && !order.shipped_notified && (tracking.url || tracking.code || stage === 'delivered')) {
    update.shipped_notified = true;
    await sendMail({
      to: order.email,
      subject: `Your order has shipped: AST-${order.id}`,
      text:
        `Hi ${order.customer_name},\n\nYour AntiSocialTalks order is on its way.\n\n${order.description}\n` +
        (tracking.carrier ? `\nCarrier: ${tracking.carrier}` : '') +
        (tracking.code ? `\nTracking number: ${tracking.code}` : '') +
        (tracking.url ? `\nTrack it here: ${tracking.url}` : '') +
        `\n\nThe AntiSocialTalks team`,
    });
  }

  if (stage === 'failed' && order.status === 'fulfilled') {
    update.status = 'fulfilment_failed';
    await notifyTeam(
      `ACTION NEEDED: ${PRINTER[provider]} ${raw} order AST-${order.id}`,
      order,
      money(order.amount, order.currency),
      `\n${PRINTER[provider]} stopped this order. Re-place it in the ${PRINTER[provider]} dashboard, or set the order to "Refund only" in the CMS.`,
    );
  }

  if (Object.keys(update).length) await updateItem('orders', order.id, update);
  return update.status ? String(update.status) : raw || 'unchanged';
}

/* ─────────────────────────── cancel and refund ─────────────────────────── */

async function refund(order: OrderRow, reason: string): Promise<string> {
  if (!order.stripe_payment_intent) throw new Error('no payment recorded on this order');
  const r = await createRefund(order.stripe_payment_intent, order.amount_minor, { order: `AST-${order.id}` });
  await updateItem('orders', order.id, {
    status: 'refunded',
    refund_id: r.id,
    date_refunded: new Date().toISOString(),
  });
  if (order.kind === 'ticket' && order.registration) {
    await updateItem('event_registrations', order.registration, { status: 'cancelled', payment_status: 'refunded' });
  }
  const amount = money(order.amount, order.currency);
  await Promise.all([
    sendMail({
      to: order.email,
      subject: `Refund on its way: AST-${order.id}`,
      text:
        `Hi ${order.customer_name},\n\n${reason}\n\n${order.description}\nRefund: ${amount}\n\n` +
        `It goes back to the card you paid with, usually within 5 to 10 working days.\n\nThe AntiSocialTalks team`,
    }),
    notifyTeam(`Refunded AST-${order.id}`, order, amount, `\nStripe refund: ${r.id}`),
  ]);
  return 'refunded';
}

/** Stop the print before refunding. Qikink has no cancel in its API, so a person does it. */
async function stopPrint(order: OrderRow): Promise<string | null> {
  if (order.kind !== 'shop') return null;
  if (providerOf(order) === 'qikink') {
    return order.qikink_order_id
      ? 'Qikink orders can only be cancelled in the Qikink dashboard (Orders). Cancel it there, then set this order to "Refund only".'
      : null;
  }
  if (!order.gelato_order_id) return null;
  try {
    await cancelOrder(order.gelato_order_id);
    return null;
  } catch (err) {
    return `Gelato would not cancel (usually already printing or shipped): ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Carry out a "Cancel and refund" or "Refund only" the team set in the CMS. */
async function processRequest(order: OrderRow): Promise<string> {
  // Never paid (an abandoned or pending checkout): nothing to refund or print.
  if (!order.stripe_payment_intent && !order.gelato_order_id && !order.qikink_order_id) {
    await updateItem('orders', order.id, { status: 'cancelled' });
    if (order.kind === 'ticket' && order.registration) {
      await updateItem('event_registrations', order.registration, { status: 'cancelled' });
    }
    return 'cancelled';
  }

  try {
    if (order.status === 'refund_requested') {
      return await refund(order, order.kind === 'ticket' ? 'Your booking has been cancelled and refunded.' : 'We’ve refunded your order.');
    }

    // cancel_requested: stop the print first; refund only if that worked.
    const blocked = await stopPrint(order);
    if (blocked) {
      await updateItem('orders', order.id, { status: 'cancel_failed', notes: blocked.slice(0, 2000) });
      await notifyTeam(
        `Could not cancel AST-${order.id}`,
        order,
        money(order.amount, order.currency),
        `\n${blocked}\nThe customer has NOT been refunded. To refund anyway, set the order to "Refund only".`,
      );
      return 'cancel_failed';
    }
    return await refund(order, order.kind === 'ticket' ? 'Your booking has been cancelled and refunded.' : 'Your order has been cancelled and refunded.');
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    await updateItem('orders', order.id, { status: 'refund_failed', notes: `Refund failed: ${why}`.slice(0, 2000) }).catch(() => {});
    await notifyTeam(`Refund failed for AST-${order.id}`, order, money(order.amount, order.currency), `\nError: ${why}`);
    return 'refund_failed';
  }
}

/* ─────────────────────────── unfinished checkouts ─────────────────────────── */

async function abandon(order: OrderRow): Promise<string> {
  await updateItem('orders', order.id, { status: 'abandoned' });
  if (order.kind === 'ticket' && order.registration) {
    await updateItem('event_registrations', order.registration, { status: 'cancelled' });
  }
  return 'abandoned';
}

async function reconcile(order: OrderRow): Promise<string> {
  if (age(order.date_created) < CHECK_AFTER) return 'waiting';

  // No checkout session means it never got as far as the payment page.
  if (order.stripe_session_id) {
    const session = await retrieveCheckoutSession(order.stripe_session_id);
    if (session.payment_status === 'paid' || session.status === 'complete') {
      const result = await settlePayment(order.stripe_session_id);
      return result.state === 'paid' ? 'recovered' : 'processing';
    }
    // An expired payment page can't be paid any more.
    if (session.status === 'expired') return abandon(order);
  }

  return age(order.date_created) > ABANDON_AFTER ? abandon(order) : 'waiting';
}

/* ─────────────────────────────── the run ─────────────────────────────── */

export type RunReport = Record<string, Record<string, number>>;

function tally(report: RunReport, job: string, outcome: string) {
  report[job] ||= {};
  report[job][outcome] = (report[job][outcome] || 0) + 1;
}

/** One pass over every order that needs attention. Errors on one order don't stop the rest. */
export async function runOrderJobs(): Promise<RunReport> {
  const report: RunReport = {};
  const jobs: Array<[string, () => Promise<OrderRow[]>, (o: OrderRow) => Promise<string>]> = [
    ['requests', () => orders({ status: { _in: ['cancel_requested', 'refund_requested'] } }), processRequest],
    ['shipping', () => orders({ _and: [{ kind: { _eq: 'shop' } }, { status: { _in: ['fulfilled', 'shipped'] } }] }, 100), syncShipment],
    ['checkouts', () => orders({ status: { _eq: 'pending' } }, 100), reconcile],
  ];

  for (const [name, find, act] of jobs) {
    let rows: OrderRow[] = [];
    try {
      rows = await find();
    } catch (err) {
      console.error(`[orders:${name}] could not list orders`, err);
      tally(report, name, 'list_error');
      continue;
    }
    for (const order of rows) {
      try {
        tally(report, name, await act(order));
      } catch (err) {
        console.error(`[orders:${name}] AST-${order.id}`, err);
        tally(report, name, 'error');
      }
    }
  }
  return report;
}
