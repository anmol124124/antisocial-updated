import { NextResponse } from 'next/server';
import { cleanAddress, deliveryOptions, priceCart } from '@/lib/cart-pricing';
import { MARKETS } from '@/lib/markets';
import { shopIsOpen } from '@/lib/shop-status';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/gelato/quote  { items: [{ slug, gelatoProductUid, quantity }], shippingAddress }
 *
 * The delivery options and prices for this cart and address, in the delivery
 * country's currency: Qikink's free delivery in India, Gelato's quote
 * elsewhere. Only products and sizes sold there can be quoted, and only the
 * delivery options go back to the browser (not the printers' own prices).
 * Nothing is ordered here.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'quote');
  if (limited) return limited;

  if (!shopIsOpen()) return NextResponse.json({ error: 'The shop isn’t open yet.' }, { status: 501 });

  let body: { items?: unknown; shippingAddress?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const address = cleanAddress(body.shippingAddress);
  if (!address.ok) return NextResponse.json({ error: address.error }, { status: 400 });
  const { market } = address.value;

  const cart = await priceCart(body.items, market);
  if (!cart.ok) return NextResponse.json({ error: cart.error }, { status: 409 });

  try {
    const shipmentMethods = await deliveryOptions(market, address.value.address, cart.value);
    return NextResponse.json({ currency: MARKETS[market].currency, shipmentMethods });
  } catch (err) {
    console.error('[gelato/quote]', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'We couldn’t get delivery options for that address. Check the postcode and country, then try again.' },
      { status: 502 },
    );
  }
}
