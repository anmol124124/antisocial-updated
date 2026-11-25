// Thin wrapper around Gelato's REST API. No SDK, no marketplace layer (no
// Shopify/Printify) — this talks to Gelato directly, which is what "no
// broker" means in practice.
//
// Gelato splits its API across a few subdomains (confirmed against
// https://dashboard.gelato.com/docs/ on 2026-09-23):
//   - product.gelatoapis.com   -> browse the print product catalog
//   - order.gelatoapis.com     -> create/track/cancel orders
//   - ecommerce.gelatoapis.com -> manage products in a "connected store"
//
// All requests are authenticated with a single header: X-API-KEY.
//
// NOTE: order payload field names below reflect Gelato's documented Order
// Create shape as of this writing. Gelato does version and tweak this API,
// so before taking real payments, create ONE test order with a Gelato
// sandbox/test API key and diff the request against
// https://dashboard.gelato.com/docs/orders/v3/create/ to catch any drift.

const PRODUCT_API = 'https://product.gelatoapis.com/v3';
const ORDER_API = 'https://order.gelatoapis.com/v4';
const ECOMMERCE_API = 'https://ecommerce.gelatoapis.com/v1';

function apiKey() {
  const key = process.env.GELATO_API_KEY;
  if (!key || key === 'your-gelato-api-key') {
    throw new Error(
      'GELATO_API_KEY is not set. Copy .env.example to .env and fill it in from https://dashboard.gelato.com'
    );
  }
  return key;
}

async function gelatoFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-API-KEY': apiKey(),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = body?.message || body?.error || res.statusText;
    const err = new Error(`Gelato API ${res.status}: ${message}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

// ---- Product catalog ----

/** List available print product catalogs (apparel, wall-art, mugs, ...). */
export function listCatalogs() {
  return gelatoFetch(`${PRODUCT_API}/catalogs`);
}

/** Search products within one catalog, e.g. catalogUid = "apparel-product". */
export function searchCatalogProducts(catalogUid, filters = {}) {
  return gelatoFetch(`${PRODUCT_API}/catalogs/${catalogUid}/products:search`, {
    method: 'POST',
    body: JSON.stringify(filters),
  });
}

/** Get full details (variants, print areas) for one product UID. */
export function getProduct(productUid) {
  return gelatoFetch(`${PRODUCT_API}/products/${productUid}`);
}

// ---- Connected-store products (optional; only if you manage a product
// catalog inside Gelato rather than fully in your own database) ----

export function listStoreProducts(storeId = process.env.GELATO_STORE_ID) {
  if (!storeId) throw new Error('GELATO_STORE_ID is not set.');
  return gelatoFetch(`${ECOMMERCE_API}/stores/${storeId}/products`);
}

// ---- Orders ----

/**
 * Get a price + shipping quote before committing to an order.
 * Useful to show accurate shipping cost/time at checkout for UAE/CA/US/IN.
 */
export function quoteOrder(orderPayload) {
  return gelatoFetch(`${ORDER_API}/orders:quote`, {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
}

/**
 * Create (submit) a real print order. Call this only after payment has
 * been captured by your payment gateway.
 *
 * @param {object} order
 * @param {string} order.orderReferenceId - your own order id, for idempotency
 * @param {string} order.customerReferenceId - your own customer id
 * @param {string} order.currency - e.g. "USD", "AED", "CAD", "INR"
 * @param {Array<{itemReferenceId:string, productUid:string, quantity:number, files:Array<{type:string,url:string}>}>} order.items
 * @param {object} order.shippingAddress - firstName, lastName, addressLine1,
 *   city, postCode, state, country (ISO-2, e.g. "AE", "CA", "US", "IN"),
 *   email, phone
 */
export function createOrder(order) {
  return gelatoFetch(`${ORDER_API}/orders`, {
    method: 'POST',
    body: JSON.stringify({ orderType: 'order', ...order }),
  });
}

export function getOrder(orderId) {
  return gelatoFetch(`${ORDER_API}/orders/${orderId}`);
}

export function cancelOrder(orderId) {
  return gelatoFetch(`${ORDER_API}/orders/${orderId}:cancel`, { method: 'POST' });
}
