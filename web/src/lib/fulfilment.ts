import 'server-only';
import { createDraftOrder, createOrder, getOrderDetail, trackingOf } from './gelato';
import { createQikinkOrder, findQikinkOrder, qikinkIsConfigured, qikinkIsSandbox, qikinkStage } from './qikink';
import type { OrderRow } from './payments';

/**
 * Who prints a paid shop order: Qikink for delivery in India, Gelato for
 * everywhere else. With Stripe test keys nothing real is printed: Gelato gets
 * a draft, and Qikink only gets the order when QIKINK_BASE_URL is its sandbox.
 */

export type Provider = 'gelato' | 'qikink';

export type Placed = {
  provider: Provider;
  /** The printer's order id; null when a test order was deliberately not sent. */
  id: string | null;
  note?: string;
};

export const providerOf = (order: Pick<OrderRow, 'fulfilment_provider' | 'shipping_address'>): Provider =>
  order.fulfilment_provider === 'qikink' || (!order.fulfilment_provider && order.shipping_address?.country === 'IN') ? 'qikink' : 'gelato';

export async function placePrintOrder(order: OrderRow, testMode: boolean): Promise<Placed> {
  if (!order.lines?.length || !order.shipping_address) throw new Error('Order has no items or address.');
  const reference = `AST-${order.id}`;

  if (providerOf(order) === 'qikink') {
    if (!qikinkIsConfigured()) throw new Error('Qikink is not set up: QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET are missing.');
    if (testMode && !qikinkIsSandbox()) {
      return { provider: 'qikink', id: null, note: 'Test payment: not sent to Qikink. Point QIKINK_BASE_URL at the sandbox to test it.' };
    }
    const placed = await createQikinkOrder({
      orderNumber: reference,
      total: order.amount,
      address: order.shipping_address,
      lines: order.lines.map((line) => {
        if (!line.qikink) throw new Error(`"${line.title}" has no Qikink product set up.`);
        return { item: line.qikink, quantity: line.quantity, unitPrice: line.unitPrice };
      }),
    });
    return { provider: 'qikink', id: placed.order_id, note: testMode ? 'Test payment: sent to the Qikink sandbox.' : undefined };
  }

  const placed = await (testMode ? createDraftOrder : createOrder)({
    orderReferenceId: reference,
    customerReferenceId: order.email,
    currency: order.currency,
    shippingAddress: order.shipping_address,
    shipmentMethodUid: order.shipment_method_uid || undefined,
    items: order.lines.map((line, i) => ({
      itemReferenceId: `${reference}-${i + 1}`,
      productUid: line.gelatoProductUid,
      quantity: line.quantity,
      files: line.printFiles?.length ? line.printFiles : line.printFileUrl ? [{ type: 'default', url: line.printFileUrl }] : [],
    })),
  });
  return { provider: 'gelato', id: placed.id, note: testMode ? 'Test payment: sent to Gelato as a draft, not printed.' : undefined };
}

export type PrintStatus = {
  /** The printer's own status word, stored on the order as is. */
  raw: string;
  stage: 'open' | 'shipped' | 'delivered' | 'failed';
  tracking: { code: string | null; url: string | null; carrier: string | null };
  shippedAt?: string | null;
};

/** Where a placed print order is now, or null when there is nothing to look up. */
export async function printStatus(order: OrderRow): Promise<PrintStatus | null> {
  if (providerOf(order) === 'qikink') {
    if (!order.qikink_order_id) return null;
    const found = await findQikinkOrder(`AST-${order.id}`);
    if (!found) return null;
    const { stage, tracking } = qikinkStage(found);
    return { raw: found.status || '', stage, tracking };
  }
  if (!order.gelato_order_id) return null;
  const g = await getOrderDetail(order.gelato_order_id);
  const raw = (g.fulfillmentStatus || '').toLowerCase();
  const stage =
    raw === 'delivered' ? 'delivered' : raw === 'shipped' ? 'shipped' : ['canceled', 'cancelled', 'failed'].includes(raw) ? 'failed' : 'open';
  return { raw, stage, tracking: trackingOf(g), shippedAt: g.shippedAt || null };
}
