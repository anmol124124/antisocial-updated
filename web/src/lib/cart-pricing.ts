import 'server-only';
import { createHash } from 'node:crypto';
import { getShopProducts, imagesFor, printFilesFor, slugify, type ShopProduct, type ShopVariant } from './content';
import { DELIVERS_TO, MARKETS, MARKET_CODES, isMarket, priceIn, type MarketCode } from './markets';
import { MAX_LINES, clampQuantity } from './cart-limits';
import { quoteOrder, shippingOptions, type ShippingAddress, type ShippingOption } from './gelato';
import type { QikinkDesign, QikinkItem } from './qikink';
import { siteUrl } from './env';
import type { CartLine } from './payments';

/**
 * Shared by the shipping quote and the checkout, so both price exactly the
 * same cart the same way: the delivery address is cleaned and checked, and
 * every line is re-read from the CMS (product, size, price in the market's
 * currency). Nothing the browser says about prices or print files is trusted.
 *
 * Orders delivered in India are printed by Qikink, with delivery included in
 * the price; everywhere else Gelato prints and quotes the delivery.
 */

export type IncomingLine = { slug?: string; gelatoProductUid?: string; quantity?: number };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The only address fields passed on to the CMS, Gelato and Qikink. */
const ADDRESS_LIMITS: Record<keyof ShippingAddress, number> = {
  firstName: 100,
  lastName: 100,
  companyName: 150,
  addressLine1: 200,
  addressLine2: 200,
  city: 120,
  state: 120,
  postCode: 20,
  country: 2,
  email: 320,
  phone: 40,
};

const REQUIRED: (keyof ShippingAddress)[] = ['firstName', 'lastName', 'addressLine1', 'city', 'postCode', 'country', 'email'];

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** Trim, whitelist and validate a delivery address; the country must be one of the markets. */
export function cleanAddress(input: unknown): Checked<{ address: ShippingAddress; market: MarketCode }> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const address = {} as Record<string, string>;
  for (const [key, max] of Object.entries(ADDRESS_LIMITS)) {
    const value = String(raw[key] ?? '').trim().slice(0, max);
    if (value) address[key] = value;
  }
  address.country = (address.country || '').toUpperCase();

  if (REQUIRED.some((k) => !address[k])) {
    return { ok: false, error: 'Please fill in your name, email and full address.' };
  }
  if (!EMAIL.test(address.email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!isMarket(address.country)) {
    return { ok: false, error: `We deliver to ${DELIVERS_TO}.` };
  }
  // US and Canadian carriers need the state or province; Indian couriers need the state and a phone number.
  if (['US', 'CA', 'IN'].includes(address.country) && !address.state) {
    return { ok: false, error: address.country === 'CA' ? 'Please enter your province.' : 'Please enter your state.' };
  }
  if (address.country === 'IN' && !/^\+?[\d\s-]{10,16}$/.test(address.phone || '')) {
    return { ok: false, error: 'Please enter a mobile number for the courier.' };
  }

  return { ok: true, value: { address: address as unknown as ShippingAddress, market: address.country } };
}

const PLACEMENT: Record<string, string> = { front: 'fr', default: 'fr', back: 'bk' };

/**
 * The Qikink product for one size and colour, or null when Qikink doesn't
 * make it. Designs are the same files Gelato prints for that colour, at the
 * size set in the CMS.
 */
export function qikinkItemFor(product: ShopProduct, variant: ShopVariant | null): QikinkItem | null {
  const config = product.qikink;
  if (!config?.sku_template) return null;
  if (variant?.markets?.length && !variant.markets.includes('IN')) return null;
  const size = variant?.size ?? null;
  if (size && Array.isArray(config.sizes) && config.sizes.length && !config.sizes.includes(size)) return null;
  // With colour codes, a colour Qikink has no code for isn't made in India.
  // Without them, only the product's first colour is: an SKU written for
  // black must never print a teal order.
  const color = variant?.color ?? null;
  const firstColor = (Array.isArray(product.variants) ? product.variants : []).find((v) => v.color)?.color ?? null;
  const colorCode = config.color_codes ? (color ? config.color_codes[color] : null) : !color || color === firstColor ? '' : null;
  if (colorCode == null) return null;

  const pictures = imagesFor(product, color);
  const image = pictures.photo || pictures.mockup;
  const designs: QikinkDesign[] = [];
  for (const file of printFilesFor(product, color)) {
    const placement = PLACEMENT[file.type];
    const area = placement ? config.designs?.[placement] : null;
    if (!placement || !area) continue;
    designs.push({
      // At most 20 characters; the same file always gets the same code.
      design_code: `AST${createHash('sha1').update(file.url).digest('hex').slice(0, 10)}${placement}`,
      width_inches: String(area.width),
      height_inches: String(area.height),
      placement_sku: placement,
      design_link: file.url,
      mockup_link: image ? `${siteUrl()}/api/assets/${image}` : file.url,
    });
  }
  if (!designs.length) return null;
  const sizeCode = size ? config.size_codes?.[size] ?? size : '';
  const template = (color && config.sku_templates?.[color]) || config.sku_template;
  return {
    sku: template.replace('{color}', colorCode).replace('{size}', sizeCode),
    print_type_id: String(config.print_type_id ?? 1),
    designs,
  };
}

/** The markets one size/colour can be sold in: Qikink must make it for India, Gelato for the rest. */
export function marketsFor(product: ShopProduct, variant: ShopVariant | null): MarketCode[] {
  return MARKET_CODES.filter((m) =>
    m === 'IN' ? qikinkItemFor(product, variant) !== null : !variant?.markets?.length || variant.markets.includes(m),
  );
}

/** Re-price the cart from the CMS for one market. */
export async function priceCart(items: unknown, marketCode: MarketCode): Promise<Checked<CartLine[]>> {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'Your cart is empty.' };
  if (items.length > MAX_LINES) return { ok: false, error: `A cart can hold up to ${MAX_LINES} different items.` };

  const market = MARKETS[marketCode];
  const catalogue = await getShopProducts();
  const lines: CartLine[] = [];

  for (const incoming of items as IncomingLine[]) {
    const match = catalogue.find((p) => (p.slug || slugify(p.title)) === incoming?.slug);
    if (!match) return { ok: false, error: 'One of the items in your cart is no longer for sale.' };

    const unitPrice = priceIn(match, market.currency);
    if (unitPrice == null) return { ok: false, error: `"${match.title}" isn’t available in ${market.label}.` };

    // A size/colour must be one the product really offers.
    const variants = Array.isArray(match.variants) ? match.variants : [];
    const variant = variants.find((v) => v.uid === incoming.gelatoProductUid) ?? null;
    if (variants.length && !variant) return { ok: false, error: `Please choose the size of "${match.title}" again.` };

    const label = variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : '';
    const title = label ? `${match.title} (${label})` : match.title;

    if (!marketsFor(match, variant).includes(marketCode)) return { ok: false, error: `"${title}" isn’t available in ${market.label}.` };
    const qikink = marketCode === 'IN' ? qikinkItemFor(match, variant) ?? undefined : undefined;

    lines.push({
      slug: match.slug || slugify(match.title),
      title,
      gelatoProductUid: variant ? variant.uid : match.gelato_product_uid,
      printFileUrl: match.print_file_url,
      printFiles: printFilesFor(match, variant?.color),
      quantity: clampQuantity(incoming.quantity),
      unitPrice,
      ...(qikink ? { qikink } : {}),
    });
  }
  return { ok: true, value: lines };
}

/** The cart as Gelato order items. */
export function gelatoItems(lines: CartLine[]) {
  return lines.map((l, i) => ({
    itemReferenceId: `line-${i + 1}`,
    productUid: l.gelatoProductUid,
    quantity: l.quantity,
    files: l.printFiles?.length ? l.printFiles : l.printFileUrl ? [{ type: 'default', url: l.printFileUrl }] : [],
  }));
}

/** India: Qikink delivers, included in the price. */
export const INDIA_DELIVERY: ShippingOption = {
  name: 'Standard delivery',
  shipmentMethodUid: 'qikink-standard',
  price: 0,
  currency: 'INR',
  minDeliveryDays: 4,
  maxDeliveryDays: 8,
};

/** The delivery options for a priced cart: Qikink's in India, Gelato's quote elsewhere. */
export async function deliveryOptions(market: MarketCode, address: ShippingAddress, lines: CartLine[]): Promise<ShippingOption[]> {
  if (market === 'IN') return [INDIA_DELIVERY];
  const quote = await quoteOrder({ currency: MARKETS[market].currency, shippingAddress: address, items: gelatoItems(lines) });
  return shippingOptions(quote);
}
