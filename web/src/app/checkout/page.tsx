'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { useCart, formatMoney } from '@/components/shop/CartProvider';
import { postApi } from '@/lib/api-client';
import { DELIVERS_TO, MARKETS, MARKET_CODES, type MarketCode } from '@/lib/markets';
import { useMarket } from '@/components/shop/MarketProvider';

type ShipMethod = {
  name: string;
  shipmentMethodUid: string;
  price: number;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
};

const field =
  'w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-mute/50 transition focus:border-sand focus:outline-none focus:ring-2 focus:ring-sand/25';


export default function CheckoutPage() {
  const { items, subtotal, currency, ready } = useCart();
  // The delivery country is the market: it sets the currency the order is priced and paid in.
  const { market, setMarket } = useMarket();
  const unavailable = items.filter((i) => i.available === false);

  const [methods, setMethods] = useState<ShipMethod[]>([]);
  const [chosen, setChosen] = useState<ShipMethod | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [address, setAddress] = useState<ReturnType<typeof readAddress> | null>(null);
  // Indian couriers need a mobile number and the state; US and Canadian carriers need the state or province.
  const india = market.code === 'IN';
  const stateNeeded = india || market.code === 'US' || market.code === 'CA';

  function readAddress(form: HTMLFormElement) {
    const d = new FormData(form);
    return {
      firstName: String(d.get('firstName') || '').trim(),
      lastName: String(d.get('lastName') || '').trim(),
      addressLine1: String(d.get('addressLine1') || '').trim(),
      addressLine2: String(d.get('addressLine2') || '').trim(),
      city: String(d.get('city') || '').trim(),
      state: String(d.get('state') || '').trim(),
      postCode: String(d.get('postCode') || '').trim(),
      country: String(d.get('country') || market.code),
      email: String(d.get('email') || '').trim(),
      phone: String(d.get('phone') || '').trim(),
    };
  }

  /** Ask what delivery to this address costs (free in India; Gelato's quote elsewhere). */
  async function onQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    setQuoting(true);
    setMethods([]);
    setChosen(null);
    const shippingAddress = readAddress(e.currentTarget);
    setAddress(shippingAddress);

    try {
      const body = await postApi('/api/gelato/quote', {
        shippingAddress,
        items: items.map((i) => ({ slug: i.slug, gelatoProductUid: i.gelatoProductUid, quantity: i.quantity })),
      });

      const found: ShipMethod[] = body.shipmentMethods || [];

      if (found.length === 0) {
        setNotice('No delivery options for that address. Check the postcode and country.');
      }
      setMethods(found);
      setChosen(found[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get a shipping quote.');
    } finally {
      setQuoting(false);
    }
  }

  /** Rates belong to the address they were quoted for, so any edit to it means quoting again. */
  function onAddressEdit(e: React.FormEvent<HTMLFormElement>) {
    if ((e.target as HTMLInputElement).name === 'shipmentMethodUid' || (methods.length === 0 && !chosen)) return;
    setMethods([]);
    setChosen(null);
    setAddress(null);
  }

  /**
   * The server re-prices the cart and opens a Stripe payment page; the visitor
   * pays there and comes back to /payment/complete. Nothing is printed until
   * the payment clears.
   */
  async function onPlaceOrder() {
    setError('');
    setPlacing(true);
    try {
      const body = await postApi('/api/checkout', {
        items: items.map((i) => ({ slug: i.slug, gelatoProductUid: i.gelatoProductUid, quantity: i.quantity })),
        shippingAddress: address,
        shipmentMethodUid: chosen?.shipmentMethodUid,
      });
      window.location.assign(body.payment.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout is not available yet.');
      setPlacing(false);
    }
  }

  const shipping = chosen?.price ?? 0;
  const total = subtotal + shipping;
  const price = (amount: number, code: string) => (amount === 0 ? 'Free' : formatMoney(amount, code));

  if (ready && items.length === 0) {
    return (
      <section className="min-h-[60vh] bg-cream py-20">
        <Container>
          <Eyebrow>Checkout</Eyebrow>
          <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">Your cart is empty.</h1>
          <div className="mt-8">
            <Button href="/shop" variant="solid-dark" arrow>
              Shop the Drop
            </Button>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-cream py-14 lg:py-20">
      <Container>
        <Link
          href="/cart"
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-mute transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
            <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to cart
        </Link>

        <Eyebrow>Checkout</Eyebrow>
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">Where should we send it?</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-14">
          <form onSubmit={onQuote} onChange={onAddressEdit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input name="firstName" required placeholder="First name" autoComplete="given-name" className={field} aria-label="First name" />
              <input name="lastName" required placeholder="Last name" autoComplete="family-name" className={field} aria-label="Last name" />
            </div>
            <input name="email" type="email" required placeholder="Email" autoComplete="email" className={field} aria-label="Email" />
            <input name="phone" type="tel" required={india} placeholder={india ? 'Mobile number (for the courier)' : 'Phone (optional)'} autoComplete="tel" className={field} aria-label="Phone" />
            <input name="addressLine1" required placeholder="Address" autoComplete="address-line1" className={field} aria-label="Address line 1" />
            <input name="addressLine2" placeholder="Apartment, suite (optional)" autoComplete="address-line2" className={field} aria-label="Address line 2" />
            <div className="grid gap-4 sm:grid-cols-3">
              <input name="city" required placeholder="City" autoComplete="address-level2" className={field} aria-label="City" />
              <input name="state" required={stateNeeded} placeholder={market.code === 'CA' ? 'Province' : stateNeeded ? 'State' : 'State / Emirate (optional)'} autoComplete="address-level1" className={field} aria-label="State" />
              <input name="postCode" required placeholder="Postcode" autoComplete="postal-code" className={field} aria-label="Postcode" />
            </div>
            <select
              name="country"
              value={market.code}
              onChange={(e) => {
                setMarket(e.target.value as MarketCode);
                // A new country means new prices and shipping: quote again.
                setMethods([]);
                setChosen(null);
              }}
              className={field}
              aria-label="Country"
            >
              {MARKET_CODES.map((code) => (
                <option key={code} value={code}>
                  {MARKETS[code].label}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-mute">
              We deliver to {DELIVERS_TO}. Prices are in {market.currency}.{india ? ' Delivery in India is free.' : ''}
            </p>
            {unavailable.length > 0 && (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                Not available in {market.label}: {unavailable.map((i) => i.title).join(', ')}. Remove it from your cart to continue.
              </p>
            )}

            <button
              type="submit"
              disabled={quoting}
              className="inline-flex h-11 items-center rounded-full bg-ink px-7 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-ink-soft disabled:opacity-60"
            >
              {quoting ? 'Getting rates…' : 'Get shipping rates'}
            </button>

            {notice && <p className="text-sm text-ink-mute">{notice}</p>}
            {error && (
              <p aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </p>
            )}

            {methods.length > 0 && (
              <fieldset className="mt-6 space-y-2.5">
                <legend className="eyebrow mb-3 text-ink-mute">Delivery</legend>
                {methods.map((method) => (
                  <label
                    key={method.shipmentMethodUid}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-ink/12 bg-white px-5 py-4 text-sm transition has-[:checked]:border-ink has-[:checked]:ring-2 has-[:checked]:ring-sand/30"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipmentMethodUid"
                        value={method.shipmentMethodUid}
                        checked={chosen?.shipmentMethodUid === method.shipmentMethodUid}
                        onChange={() => setChosen(method)}
                        className="h-4 w-4 accent-[#c8a67f]"
                      />
                      <span>
                        <span className="font-semibold">{method.name}</span>
                        {method.minDeliveryDays != null && (
                          <span className="ml-2 text-ink-mute">
                            {method.minDeliveryDays}–{method.maxDeliveryDays} days
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-semibold">{price(method.price, method.currency)}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </form>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[1.5rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06]">
              <h2 className="text-lg font-bold tracking-tight">Order</h2>

              <ul className="mt-5 space-y-3 border-b border-ink/10 pb-5 text-sm">
                {items.map((item) => (
                  <li key={`${item.slug}-${item.gelatoProductUid}`} className="flex justify-between gap-4">
                    <span className="text-ink-mute">
                      {item.title} <span className="tabular-nums">× {item.quantity}</span>
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatMoney(item.unitPrice * item.quantity, item.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Subtotal</dt>
                  <dd className="font-semibold">{formatMoney(subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Shipping</dt>
                  <dd className="font-semibold">
                    {chosen ? price(shipping, chosen.currency) : 'Next step'}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-ink/10 pt-3 text-base">
                  <dt className="font-bold">Total</dt>
                  <dd className="font-bold">{formatMoney(total, currency)}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={!chosen || !address || placing || unavailable.length > 0}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-7 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {placing ? 'Opening secure payment…' : 'Pay and place order'}
              </button>

              <p className="mt-4 text-xs leading-relaxed text-ink-mute">
                Payments are handled securely by Stripe. Each item is printed to order once your payment
                clears.
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
