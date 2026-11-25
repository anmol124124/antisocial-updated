'use client';

import type { MarketCode } from '@/lib/markets';
import { useMarket } from './MarketProvider';
import { useProductColour } from './ProductColour';

export type SpecTable = Record<string, Partial<Record<MarketCode, [string, string][]>>>;

/**
 * The specification of the picked colour as made for the visitor's market:
 * in India the garment is Qikink's, elsewhere Gelato's. `table` is colour ->
 * market -> rows, worked out on the server.
 */
export function ProductSpecs({ table, fallback }: { table: SpecTable; fallback: string }) {
  const { market } = useMarket();
  const picked = useProductColour()?.color;
  const rows = (picked && table[picked] ? table[picked] : table[fallback])?.[market.code] ?? [];
  if (!rows.length) return null;
  return (
    <div className="mt-8">
      <h2 className="eyebrow mb-4 text-ink-mute">Specification</h2>
      <dl className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-32 shrink-0 font-semibold">{label}</dt>
            <dd className="text-ink-mute">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
