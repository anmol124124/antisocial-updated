import 'server-only';
import { gelatoApiKey } from './env';

/**
 * Direct Gelato REST integration — no Shopify/Printify layer in between.
 *
 * Gelato splits its API across subdomains:
 *   product.gelatoapis.com    browse the print catalog
 *   order.gelatoapis.com      quote / create / track / cancel orders
 *   ecommerce.gelatoapis.com  manage products inside a connected store
 *
 * Every request authenticates with one header: X-API-KEY.
 *
 * Before taking real money, place ONE order with a test key and diff the
 * request against https://dashboard.gelato.com/docs/orders/v4/create/ —
 * Gelato does revise these payloads.
 */

const PRODUCT_API = 'https://product.gelatoapis.com/v3';
const ORDER_API = 'https://order.gelatoapis.com/v4';

export class GelatoError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'GelatoError';
    this.status = status;
    this.body = body;
  }
}

async function gelatoFetch<T>(url: string, init: RequestInit & { next?: { revalidate?: number } } = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'X-API-KEY': gelatoApiKey(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    // Orders and quotes are always live. Catalogue reads may opt into caching
    // (`next.revalidate`), which also lets pages that use them stay static.
    ...(init.next ? {} : { cache: 'no-store' as const }),
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // An HTML error page from a proxy in front of Gelato, not JSON.
    body = { message: text.slice(0, 200) };
  }

  if (!res.ok) {
    const message =
      (body as { message?: string; error?: string } | null)?.message ||
      (body as { error?: string } | null)?.error ||
      res.statusText;
    throw new GelatoError(`Gelato API ${res.status}: ${message}`, res.status, body);
  }

  return body as T;
}

/* ─────────────────────────── product catalog ─────────────────────────── */

export type Catalog = { catalogUid: string; title: string; productAttributes?: unknown[] };

export function listCatalogs() {
  return gelatoFetch<Catalog[]>(`${PRODUCT_API}/catalogs`);
}

export function getCatalog(catalogUid: string) {
  return gelatoFetch<Catalog>(`${PRODUCT_API}/catalogs/${catalogUid}`);
}

export type CatalogSearchResult = {
  products: Array<{ productUid: string; attributes?: Record<string, string> }>;
  hits?: unknown;
};

export function searchCatalogProducts(catalogUid: string, filters: Record<string, unknown> = {}) {
  return gelatoFetch<CatalogSearchResult>(
    `${PRODUCT_API}/catalogs/${catalogUid}/products:search`,
    { method: 'POST', body: JSON.stringify(filters) },
  );
}

export type GelatoProduct = {
  productUid: string;
  attributes?: Record<string, string>;
  weight?: { value: number; measureUnit: string };
  dimensions?: Record<string, { value: number; measureUnit: string }>;
  supportedCountries?: string[];
  printAreas?: unknown[];
  notSupportedCountries?: string[];
};

/** Catalogue details change rarely, so they are cached for a day. */
export function getProduct(productUid: string) {
  return gelatoFetch<GelatoProduct>(`${PRODUCT_API}/products/${encodeURIComponent(productUid)}`, {
    next: { revalidate: 86_400 },
  });
}

export type PriceRow = {
  productUid: string;
  country: string;
  currency: string;
  price: number;
  pageCount?: number | null;
  quantity: number;
};

/** Wholesale price Gelato charges you, per country/currency. */
export function getProductPrices(productUid: string, country?: string, currency?: string) {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (currency) params.set('currency', currency);
  const qs = params.size ? `?${params}` : '';
  return gelatoFetch<PriceRow[]>(
    `${PRODUCT_API}/products/${encodeURIComponent(productUid)}/prices${qs}`,
  );
}

/* ──────────────────────────────  orders  ──────────────────────────── */

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postCode: string;
  state?: string;
  /** ISO-2, e.g. AE, CA, US, IN */
  country: string;
  email: string;
  phone?: string;
  companyName?: string;
};

export type OrderItem = {
  itemReferenceId: string;
  productUid: string;
  quantity: number;
  files: Array<{ type: string; url: string }>;
};

export type OrderPayload = {
  orderReferenceId: string;
  customerReferenceId?: string;
  currency: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  shipmentMethodUid?: string;
};

export type QuoteResponse = {
  orderReferenceId?: string;
  quotes?: Array<{
    id: string;
    itemReferenceIds: string[];
    fulfillmentCountry?: string;
    shipmentMethods?: Array<{
      name: string;
      shipmentMethodUid: string;
      price: number;
      currency: string;
      minDeliveryDays?: number;
      maxDeliveryDays?: number;
    }>;
    products?: Array<{ itemReferenceId: string; productUid: string; quantity: number; price?: number }>;
  }>;
};

/**
 * Price + shipping quote. Call before checkout so the customer sees real totals.
 * The quote endpoint names things differently from order create
 * (recipient/products rather than shippingAddress/items), so this translates.
 */
export function quoteOrder(payload: Omit<OrderPayload, 'orderReferenceId'> & { orderReferenceId?: string }) {
  return gelatoFetch<QuoteResponse>(`${ORDER_API}/orders:quote`, {
    method: 'POST',
    body: JSON.stringify({
      orderReferenceId: payload.orderReferenceId || `quote-${Date.now()}`,
      customerReferenceId: payload.customerReferenceId || payload.shippingAddress.email || 'guest',
      currency: payload.currency,
      allowMultipleQuotes: true,
      recipient: payload.shippingAddress,
      products: payload.items,
    }),
  });
}

export type ShippingOption = {
  name: string;
  shipmentMethodUid: string;
  /** Total across every parcel the cart ships in. */
  price: number;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
};

/**
 * One list of delivery choices for the whole cart. A cart can be split across
 * print facilities (one quote each); each option is priced as that method
 * where a parcel offers it, otherwise that parcel's cheapest method.
 */
export function shippingOptions(quote: QuoteResponse): ShippingOption[] {
  const quotes = (quote.quotes || []).filter((q) => q.shipmentMethods?.length);
  if (!quotes.length) return [];
  return quotes[0].shipmentMethods!.map((first) => {
    let price = 0;
    let max = first.maxDeliveryDays;
    for (const q of quotes) {
      const methods = q.shipmentMethods!;
      const same = methods.find((m) => m.shipmentMethodUid === first.shipmentMethodUid);
      const pick = same || methods.reduce((a, b) => (Number(b.price) < Number(a.price) ? b : a));
      price += Number(pick.price);
      if (pick.maxDeliveryDays != null && (max == null || pick.maxDeliveryDays > max)) max = pick.maxDeliveryDays;
    }
    return {
      name: first.name,
      shipmentMethodUid: first.shipmentMethodUid,
      price: Math.round(price * 100) / 100,
      currency: first.currency,
      minDeliveryDays: first.minDeliveryDays,
      maxDeliveryDays: max,
    };
  });
}

export type GelatoOrder = { id: string; orderReferenceId: string; fulfillmentStatus: string };

/**
 * Submit a real print order. Only ever call this AFTER payment has been
 * captured — otherwise Gelato prints and bills you for something nobody
 * paid for. The one caller is the payment webhook.
 */
export function createOrder(order: OrderPayload) {
  return gelatoFetch<GelatoOrder>(`${ORDER_API}/orders`, {
    method: 'POST',
    body: JSON.stringify({ orderType: 'order', ...order }),
  });
}

/** Same shape as createOrder but Gelato only validates it — nothing is printed. */
export function createDraftOrder(order: OrderPayload) {
  return gelatoFetch<GelatoOrder>(`${ORDER_API}/orders`, {
    method: 'POST',
    body: JSON.stringify({ orderType: 'draft', ...order }),
  });
}

export function getOrder(orderId: string) {
  return gelatoFetch<GelatoOrder>(`${ORDER_API}/orders/${encodeURIComponent(orderId)}`);
}

export function cancelOrder(orderId: string) {
  return gelatoFetch<unknown>(`${ORDER_API}/orders/${encodeURIComponent(orderId)}:cancel`, {
    method: 'POST',
  });
}

/* ───────────────────────────── tracking ───────────────────────────── */

export type GelatoOrderDetail = {
  id: string;
  orderReferenceId: string;
  /** created, passed, in_production, printed, shipped, delivered, canceled, failed, ... */
  fulfillmentStatus: string;
  shippedAt?: string | null;
  shipment?: {
    shipmentMethodName?: string | null;
    packages?: Array<{ trackingCode?: string | null; trackingUrl?: string | null }>;
  } | null;
};

export function getOrderDetail(orderId: string) {
  return gelatoFetch<GelatoOrderDetail>(`${ORDER_API}/orders/${encodeURIComponent(orderId)}`);
}

/** The first parcel's tracking number and link, once Gelato has them. */
export function trackingOf(order: GelatoOrderDetail): { code: string | null; url: string | null; carrier: string | null } {
  const parcel = (order.shipment?.packages || []).find((p) => p.trackingUrl || p.trackingCode);
  return {
    code: parcel?.trackingCode || null,
    url: parcel?.trackingUrl || null,
    carrier: order.shipment?.shipmentMethodName || null,
  };
}
