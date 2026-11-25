/**
 * The countries the shop sells and ships to. India is priced and paid in
 * rupees (printed in India by Qikink); every other market is priced and paid
 * in US dollars (printed by Gelato: locally in the US, Canada and the UK,
 * shipped in from Europe for the UAE). Prices per currency live in
 * shop_products.prices, e.g. { "INR": 999, "USD": 39 }.
 *
 * Plain module: used by server routes and client components alike.
 */

export const MARKETS = {
  IN: { code: 'IN', label: 'India', currency: 'INR' },
  US: { code: 'US', label: 'United States', currency: 'USD' },
  CA: { code: 'CA', label: 'Canada', currency: 'USD' },
  GB: { code: 'GB', label: 'United Kingdom', currency: 'USD' },
  AE: { code: 'AE', label: 'United Arab Emirates', currency: 'USD' },
} as const;

/** Where the shop delivers, for messages. */
export const DELIVERS_TO = 'India, the United States, Canada, the United Kingdom and the UAE';

export type MarketCode = keyof typeof MARKETS;
export type Market = (typeof MARKETS)[MarketCode];

export const MARKET_CODES = Object.keys(MARKETS) as MarketCode[];

/** What the page shows before the visitor's market is known. */
export const DEFAULT_MARKET: MarketCode = 'IN';

export function isMarket(code: string | null | undefined): code is MarketCode {
  // Own keys only: `'toString' in MARKETS` is true too.
  return !!code && Object.hasOwn(MARKETS, code);
}

/** A visitor's country to the market they buy in; everywhere else shops in US dollars. */
export function marketForCountry(country: string | null | undefined): MarketCode {
  const cc = (country || '').toUpperCase();
  return isMarket(cc) ? cc : 'US';
}

export type Prices = Partial<Record<string, number>>;

/**
 * A product's price in one currency: the per-market price if set, else the
 * single legacy price when it is already in that currency. Null when the
 * product isn't sold in that currency.
 */
export function priceIn(
  product: { price?: number | string | null; currency?: string | null; prices?: Prices | null },
  currency: string,
): number | null {
  const fromMap = product.prices?.[currency];
  if (fromMap != null && Number(fromMap) > 0) return Number(fromMap);
  if (product.price != null && (product.currency || '').toUpperCase() === currency && Number(product.price) > 0) {
    return Number(product.price);
  }
  return null;
}
