'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart, type CartItem } from './CartProvider';
import { useProductColour } from './ProductColour';
import type { ShopVariant } from '@/lib/content';
import { priceIn, type MarketCode } from '@/lib/markets';
import { MAX_QUANTITY } from '@/lib/cart-limits';
import { useMarket } from './MarketProvider';

const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter(Boolean) as string[])];

// Sizes in shop order, whatever order the colours list them in.
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const bySize = (a: string, b: string) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99);

/** A size/colour with the markets it can be made for (Qikink in India, Gelato elsewhere). */
export type SaleVariant = ShopVariant & { sellIn?: MarketCode[] };

export type ColourInfo = { note?: string | null; swatch?: string | null; image?: string | null };

/**
 * Quantity + add to cart. With `variants`, the visitor first picks a colour
 * and/or size; each combination is its own product at the printer, and
 * combinations that don't exist are disabled rather than hidden. Colours and
 * sizes not made for the visitor's market are left out. With `comingSoon` the
 * options still show but the product can't be added yet.
 *
 * Inside a ProductColourProvider the picked colour is shared with the
 * pictures on the page.
 */
export function AddToCart({
  item,
  variants = [],
  comingSoon = false,
  colours = {},
}: {
  item: Omit<CartItem, 'quantity'>;
  variants?: SaleVariant[];
  comingSoon?: boolean;
  colours?: Record<string, ColourInfo>;
}) {
  const { add } = useCart();
  const { market } = useMarket();
  const shared = useProductColour();
  const live = variants.filter((v) => !v.sellIn || v.sellIn.includes(market.code));
  // Some products, or some of their colours, are not sold in every market.
  const soldHere =
    priceIn({ prices: item.prices, price: item.unitPrice, currency: item.currency }, market.currency) != null &&
    (variants.length === 0 || live.length > 0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const colors = unique(live.map((v) => v.color));
  const sizes = unique(variants.map((v) => v.size)).sort(bySize);
  const [ownColor, setOwnColor] = useState(colors[0] ?? null);
  const wanted = shared ? shared.color : ownColor;
  const color = wanted && colors.includes(wanted) ? wanted : colors[0] ?? null;
  const setColor = (c: string) => (shared ? shared.setColor(c) : setOwnColor(c));
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);

  // After a market switch, keep the pictures on a colour this market sells.
  useEffect(() => {
    if (shared && color && shared.color !== color) shared.setColor(color);
  }, [shared, color]);

  const exists = (c: string | null, s: string | null) =>
    live.some((v) => (!colors.length || v.color === c) && (!sizes.length || v.size === s));
  const chosen = variants.length
    ? live.find((v) => (!colors.length || v.color === color) && (!sizes.length || v.size === size)) ?? null
    : null;
  const needsChoice = variants.length > 0 && !chosen;
  const blocked = needsChoice || !soldHere;
  const note = color ? colours[color]?.note : null;

  function onAdd() {
    if (blocked) return;
    add(
      chosen
        ? {
            ...item,
            gelatoProductUid: chosen.uid,
            image: (chosen.color && colours[chosen.color]?.image) || item.image,
            variantLabel: [chosen.color, chosen.size].filter(Boolean).join(' / '),
          }
        : item,
      quantity,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  }

  const option = (active: boolean, available: boolean) =>
    `inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-4 text-xs font-semibold transition ${
      active
        ? 'border-ink bg-ink text-white'
        : available
          ? 'border-ink/15 bg-white text-ink hover:border-ink'
          : 'cursor-not-allowed border-ink/10 bg-white text-ink-mute/40 line-through'
    }`;

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-2.5 text-ink-mute">Colour{color ? `: ${color}` : ''}</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button key={c} type="button" aria-pressed={c === color} onClick={() => setColor(c)} className={`${option(c === color, true)} gap-2`}>
                {colours[c]?.swatch && (
                  <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-ink/20" style={{ background: colours[c]?.swatch ?? undefined }} />
                )}
                {c}
              </button>
            ))}
          </div>
          {note && <p className="mt-2 text-xs text-ink-mute">{note}</p>}
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-2.5 text-ink-mute">Size{size ? `: ${size}` : ''}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const available = exists(color, s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!available}
                  aria-pressed={s === size}
                  onClick={() => setSize(s)}
                  className={option(s === size && available, available)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {comingSoon ? (
        <div className="space-y-3">
          <button
            type="button"
            disabled
            className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-ink/80 px-7 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white"
          >
            Coming Soon
          </button>
          <p className="text-sm text-ink-mute">
            Orders open soon.{' '}
            <Link href="/community" className="link-underline font-semibold text-ink">
              Join the community
            </Link>{' '}
            to hear first.
          </p>
        </div>
      ) : (
      <div className="flex items-center gap-4">
        <div className="inline-flex h-11 items-center rounded-full border border-ink/15 bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="grid h-11 w-11 place-items-center rounded-l-full text-ink-mute transition hover:text-ink"
          >
            &minus;
          </button>
          <span aria-live="polite" className="w-8 text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
            className="grid h-11 w-11 place-items-center rounded-r-full text-ink-mute transition hover:text-ink"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={blocked}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-ink px-7 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!soldHere ? `Not available in ${market.label}` : needsChoice ? 'Choose a size' : 'Add to cart'}
        </button>
      </div>
      )}

      {added && (
        <p aria-live="polite" className="text-sm text-ink-mute">
          Added.{' '}
          <Link href="/cart" className="link-underline font-semibold text-ink">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
