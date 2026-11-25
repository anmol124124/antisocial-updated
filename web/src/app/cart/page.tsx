'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { useCart, formatMoney, lineKey } from '@/components/shop/CartProvider';
import { useMarket } from '@/components/shop/MarketProvider';
import { MAX_QUANTITY } from '@/lib/cart-limits';

export default function CartPage() {
  const { items, subtotal, currency, setQuantity, remove, clear, ready } = useCart();
  const { market } = useMarket();
  const unavailable = items.some((i) => i.available === false);

  return (
    <section className="min-h-[60vh] bg-cream py-14 lg:py-20">
      <Container>
        <Eyebrow>Your cart</Eyebrow>
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">
          {items.length === 0 ? 'Nothing here yet.' : 'Almost yours.'}
        </h1>

        {!ready ? (
          <p className="mt-8 text-sm text-ink-mute">Loading your cart…</p>
        ) : items.length === 0 ? (
          <div className="mt-8">
            <p className="max-w-md text-[0.9375rem] text-ink-mute">
              Your cart is empty. Pick something from the shop.
            </p>
            <div className="mt-8">
              <Button href="/shop" variant="solid-dark" arrow>
                Shop the Drop
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-14">
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {items.map((item) => {
                const key = lineKey(item);
                return (
                  <li key={key} className="flex gap-5 py-6">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-ink">
                      {item.image ? (
                        <Image src={item.image} alt="" fill sizes="96px" className="object-cover" />
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-sm font-bold tracking-tight">
                            <Link href={`/shop/${item.slug}`} className="link-underline">
                              {item.title}
                            </Link>
                          </h2>
                          {item.variantLabel && (
                            <p className="mt-1 text-xs text-ink-mute">{item.variantLabel}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-right text-sm font-bold">
                          {item.available === false ? (
                            <span className="font-medium text-red-600">Not available in {market.label}</span>
                          ) : (
                            formatMoney(item.unitPrice * item.quantity, item.currency)
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="inline-flex h-9 items-center rounded-full border border-ink/15 bg-white">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${item.title}`}
                            onClick={() => setQuantity(key, item.quantity - 1)}
                            className="grid h-9 w-9 place-items-center rounded-l-full text-ink-mute transition hover:text-ink"
                          >
                            &minus;
                          </button>
                          <span className="w-7 text-center text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${item.title}`}
                            onClick={() => setQuantity(key, item.quantity + 1)}
                            disabled={item.quantity >= MAX_QUANTITY}
                            className="grid h-9 w-9 place-items-center rounded-r-full text-ink-mute transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(key)}
                          className="text-xs font-semibold text-ink-mute underline-offset-4 transition hover:text-ink hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[1.5rem] bg-white p-7 shadow-sm ring-1 ring-ink/[0.06]">
                <h2 className="text-lg font-bold tracking-tight">Summary</h2>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-mute">Subtotal</dt>
                    <dd className="font-semibold">{formatMoney(subtotal, currency)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-mute">Shipping</dt>
                    <dd className="text-ink-mute">Calculated at checkout</dd>
                  </div>
                </dl>
                <div className="mt-6 border-t border-ink/10 pt-5">
                  {unavailable ? (
                    <p role="alert" className="text-sm text-red-600">
                      Remove the items not sold in {market.label}, or choose another country, to check out.
                    </p>
                  ) : (
                    <Button href="/checkout" variant="solid-dark" arrow className="w-full">
                      Checkout
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={clear}
                    className="mt-4 w-full text-xs font-semibold text-ink-mute underline-offset-4 transition hover:text-ink hover:underline"
                  >
                    Empty cart
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </section>
  );
}
