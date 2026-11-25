'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_MARKET, MARKETS, isMarket, type Market, type MarketCode } from '@/lib/markets';

/**
 * Which market (and so which currency) the visitor shops in: their country,
 * from /api/market (Cloudflare's geolocation), else India. Pages are static,
 * so this is settled in the browser. At checkout the delivery country takes
 * over for the rest of the visit (it decides the currency and the printer);
 * it is not remembered.
 */

type MarketContextValue = { market: Market; setMarket: (code: MarketCode) => void; ready: boolean };

const MarketContext = createContext<MarketContextValue | null>(null);
// Where the old "Prices for" menu saved a choice; dropped so it never overrides the country.
const OLD_CHOICE_KEY = 'ast.market.v1';

export function MarketProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<MarketCode>(DEFAULT_MARKET);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem(OLD_CHOICE_KEY);
    } catch {
      /* storage blocked: nothing saved */
    }
    let cancelled = false;
    fetch('/api/market')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { market?: string } | null) => {
        if (!cancelled && isMarket(body?.market)) setCode(body!.market as MarketCode);
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const setMarket = useCallback((next: MarketCode) => setCode(next), []);

  const value = useMemo(() => ({ market: MARKETS[code], setMarket, ready }), [code, setMarket, ready]);
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used inside <MarketProvider>.');
  return ctx;
}
