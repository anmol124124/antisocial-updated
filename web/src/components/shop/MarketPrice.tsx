'use client';

import { formatMoney } from '@/lib/money';
import { priceIn, type Prices } from '@/lib/markets';
import { useMarket } from './MarketProvider';

/** A product's price in the visitor's market currency; hidden until their country is known. */
export function MarketPrice({
  prices,
  price,
  currency,
  className = '',
}: {
  prices?: Prices | null;
  price?: number | null;
  currency?: string | null;
  className?: string;
}) {
  const { market, ready } = useMarket();
  const amount = priceIn({ prices, price, currency }, market.currency);
  // Until then the space is kept, so nothing jumps when the right currency appears.
  return (
    <span className={`${className} ${ready ? '' : 'invisible'}`}>
      {amount != null ? formatMoney(amount, market.currency) : `Not available in ${market.label}`}
    </span>
  );
}
