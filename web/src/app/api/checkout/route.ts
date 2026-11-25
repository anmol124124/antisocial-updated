import { NextResponse } from 'next/server';
import { paymentsAreConfigured, startPayment } from '@/lib/payments';
import { cleanAddress, deliveryOptions, priceCart } from '@/lib/cart-pricing';
import { MARKETS } from '@/lib/markets';
import { shopIsOpen } from '@/lib/shop-status';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout  { items, shippingAddress, shipmentMethodUid }
 *
 * Opens a Stripe Checkout page for the cart and answers with its URL. Nothing
 * is sent to the printer here: the order is placed only after Stripe confirms
 * the money (lib/payments).
 *
 * The delivery country sets the market (currency, price list, and who prints:
 * Qikink in India, Gelato elsewhere). Prices are re-read from the CMS and
 * delivery is re-quoted, so a tampered cart cannot set its own price.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'checkout');
  if (limited) return limited;

  if (!shopIsOpen() || !paymentsAreConfigured()) {
    // The visitor gets a plain message; the fix is for whoever reads the log.
    console.warn('[checkout] closed: NEXT_PUBLIC_SHOP_OPEN, PAYMENT_GATEWAY=stripe and STRIPE_SECRET_KEY are all needed');
    return NextResponse.json({ error: 'Checkout isn’t open yet. Please check back soon.' }, { status: 501 });
  }

  let body: { items?: unknown; shippingAddress?: unknown; shipmentMethodUid?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const address = cleanAddress(body.shippingAddress);
  if (!address.ok) return NextResponse.json({ error: address.error }, { status: 400 });
  const shipmentMethodUid = typeof body.shipmentMethodUid === 'string' ? body.shipmentMethodUid : '';
  if (!shipmentMethodUid) return NextResponse.json({ error: 'Please choose a delivery option.' }, { status: 400 });

  const { address: shippingAddress, market } = address.value;
  const currency = MARKETS[market].currency;

  const cart = await priceCart(body.items, market);
  if (!cart.ok) return NextResponse.json({ error: cart.error }, { status: 409 });
  const lines = cart.value;

  // Delivery as the printer prices it for this address and method, not as the browser says.
  let shipping = 0;
  try {
    const method = (await deliveryOptions(market, shippingAddress, lines)).find((m) => m.shipmentMethodUid === shipmentMethodUid);
    if (!method) throw new Error('chosen delivery option not offered');
    if (method.currency.toUpperCase() !== currency) throw new Error(`delivery quoted in ${method.currency}`);
    shipping = method.price;
  } catch (err) {
    console.error('[checkout] delivery quote', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'We couldn’t confirm delivery for that address. Please get the rates again.' }, { status: 409 });
  }

  try {
    const payment = await startPayment({
      kind: 'shop',
      currency,
      lines: [
        ...lines.map((l) => ({ name: l.title, unitPrice: l.unitPrice, quantity: l.quantity })),
        ...(shipping > 0 ? [{ name: 'Delivery', unitPrice: shipping, quantity: 1 }] : []),
      ],
      customer: {
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
        email: shippingAddress.email,
        phone: shippingAddress.phone,
      },
      description: lines.map((l) => `${l.quantity} × ${l.title}`).join(', ').slice(0, 250),
      returnTo: '/checkout',
      extra: {
        lines,
        shipping_address: shippingAddress,
        shipment_method_uid: shipmentMethodUid,
        shipping_amount: shipping,
        fulfilment_provider: market === 'IN' ? 'qikink' : 'gelato',
      },
    });
    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    console.error('[checkout]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'We couldn’t start the payment. Please try again shortly.' }, { status: 502 });
  }
}
