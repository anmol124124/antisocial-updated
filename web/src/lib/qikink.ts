import 'server-only';
import type { ShippingAddress } from './gelato';

/**
 * Qikink: print on demand inside India, for orders delivered in India.
 *
 *   QIKINK_CLIENT_ID, QIKINK_CLIENT_SECRET   Qikink dashboard -> Integration -> Custom API
 *   QIKINK_BASE_URL   https://sandbox.qikink.com to test (separate account and
 *                     products), https://api.qikink.com (the default) for real orders
 *
 * There is no cancel call in Qikink's API, and order lookups don't work in the
 * sandbox: cancelling is done in the Qikink dashboard.
 */

const LIVE = 'https://api.qikink.com';

export const qikinkBase = (): string => (process.env.QIKINK_BASE_URL || LIVE).replace(/\/$/, '');
export const qikinkIsSandbox = (): boolean => qikinkBase().includes('sandbox');

export function qikinkIsConfigured(): boolean {
  return Boolean(process.env.QIKINK_CLIENT_ID && process.env.QIKINK_CLIENT_SECRET);
}

let token: { key: string; value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  const key = `${qikinkBase()}|${process.env.QIKINK_CLIENT_ID}`;
  if (token && token.key === key && token.expires > Date.now() + 60_000) return token.value;

  // Form fields, not JSON.
  const res = await fetch(`${qikinkBase()}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ClientId: process.env.QIKINK_CLIENT_ID || '', client_secret: process.env.QIKINK_CLIENT_SECRET || '' }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as { Accesstoken?: string; expires_in?: number | string } | null;
  if (!res.ok || !body?.Accesstoken) throw new Error(`Qikink sign-in failed (${res.status}). Check QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET.`);
  token = { key, value: body.Accesstoken, expires: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  return token.value;
}

async function qikink<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${qikinkBase()}${path}`, {
    ...init,
    headers: {
      ClientId: process.env.QIKINK_CLIENT_ID || '',
      Accesstoken: await accessToken(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  // An expired token: sign in again once.
  if (res.status === 401 && !retried) {
    token = null;
    return qikink<T>(path, init, true);
  }
  const text = await res.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text.slice(0, 200) };
  }
  const failed = !res.ok || (body?.status_code != null && String(body.status_code) !== '200') || body?.success === false;
  if (failed) throw new Error(`Qikink ${res.status}: ${String(body?.error || body?.message || res.statusText)}`);
  return body as T;
}

/** One printed placement: "fr" front, "bk" back. */
export type QikinkDesign = {
  design_code: string;
  width_inches: string;
  height_inches: string;
  placement_sku: string;
  design_link: string;
  mockup_link: string;
};

/** What a cart line needs to become a Qikink line, worked out when the cart is priced. */
export type QikinkItem = { sku: string; print_type_id: string; designs: QikinkDesign[] };

/** Place a prepaid order that Qikink prints and ships. Order numbers are at most 15 characters. */
export async function createQikinkOrder(input: {
  orderNumber: string;
  total: number;
  lines: { item: QikinkItem; quantity: number; unitPrice: number }[];
  address: ShippingAddress;
}): Promise<{ order_id: string }> {
  const a = input.address;
  const body = {
    order_number: input.orderNumber.slice(0, 15),
    qikink_shipping: '1',
    gateway: 'Prepaid',
    total_order_value: String(input.total),
    line_items: input.lines.map(({ item, quantity, unitPrice }) => ({
      search_from_my_products: 0,
      print_type_id: item.print_type_id,
      quantity: String(quantity),
      price: String(unitPrice),
      sku: item.sku,
      designs: item.designs,
    })),
    shipping_address: {
      first_name: a.firstName,
      last_name: a.lastName,
      address1: a.addressLine1,
      address2: a.addressLine2 || '',
      phone: a.phone || '',
      email: a.email,
      city: a.city,
      zip: a.postCode,
      province: a.state || '',
      country_code: a.country,
    },
  };
  const res = await qikink<{ order_id?: string | number }>('/api/order/create', { method: 'POST', body: JSON.stringify(body) });
  if (res.order_id == null) throw new Error('Qikink accepted the order but returned no order id.');
  return { order_id: String(res.order_id) };
}

export type QikinkOrder = {
  order_id?: string | number;
  number?: string;
  status?: string;
  shipping?: { awb?: string | null; tracking_link?: string | null; courier_provider_name?: string | null } | null;
};

/** The order Qikink holds under our order number, or null if it has none. */
export async function findQikinkOrder(orderNumber: string): Promise<QikinkOrder | null> {
  const res = await qikink<{ data?: QikinkOrder[] }>(`/api/order/list?${new URLSearchParams({ order_reference_no: orderNumber })}`);
  return res.data?.[0] ?? null;
}

const FAILED = ['cancelled', 'lost', 'returned', 'partially returned', 'rto initiated', 'archived', 'out of stock', 'live-oos'];

/** Qikink's status in the terms the order job uses. */
export function qikinkStage(order: QikinkOrder): {
  stage: 'open' | 'shipped' | 'delivered' | 'failed';
  tracking: { code: string | null; url: string | null; carrier: string | null };
} {
  const status = (order.status || '').trim().toLowerCase();
  const awb = order.shipping?.awb || null;
  const tracking = {
    code: awb,
    url: order.shipping?.tracking_link || (awb ? `https://courierupdates.com/?awb=${encodeURIComponent(awb)}` : null),
    carrier: order.shipping?.courier_provider_name || null,
  };
  if (status === 'delivered') return { stage: 'delivered', tracking };
  if (FAILED.includes(status)) return { stage: 'failed', tracking };
  return { stage: awb ? 'shipped' : 'open', tracking };
}
