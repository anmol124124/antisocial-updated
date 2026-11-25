'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { priceIn, type Prices } from '@/lib/markets';
import { clampQuantity } from '@/lib/cart-limits';
import { useMarket } from './MarketProvider';

export type CartItem = {
  slug: string;
  title: string;
  gelatoProductUid: string;
  printFileUrl: string | null;
  image: string | null;
  unitPrice: number;
  currency: string;
  /** Price per market currency; the cart shows the one for the visitor's market. */
  prices?: Prices;
  /** False when this item isn't sold in the visitor's current market. */
  available?: boolean;
  variantLabel?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  currency: string;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ast.cart.v1';

/** A line is identified by product + variant, so two sizes of one shirt stay separate. */
export function lineKey(item: Pick<CartItem, 'slug' | 'gelatoProductUid'>): string {
  return `${item.slug}::${item.gelatoProductUid}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // localStorage is per-browser and can throw in private mode, so every access
  // is guarded and the cart simply starts empty when it is unavailable.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // A cart saved by an older version of the site, or edited by hand, is
        // tidied up rather than trusted.
        if (Array.isArray(parsed)) {
          setItems(
            parsed
              .filter((i): i is CartItem => !!i && typeof i.slug === 'string' && typeof i.gelatoProductUid === 'string')
              .map((i) => ({ ...i, quantity: clampQuantity(i.quantity), unitPrice: Number(i.unitPrice) || 0 })),
          );
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const key = lineKey(item);
      const existing = prev.find((i) => lineKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i) === key ? { ...i, quantity: clampQuantity(i.quantity + quantity) } : i,
        );
      }
      return [...prev, { ...item, quantity: clampQuantity(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => lineKey(i) !== key)
        : prev.map((i) => (lineKey(i) === key ? { ...i, quantity: clampQuantity(quantity) } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => lineKey(i) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { market, ready: marketReady } = useMarket();

  const value = useMemo<CartContextValue>(() => {
    // Every line is shown in the visitor's market currency.
    const priced = items.map((i) => {
      const price = i.prices ? priceIn({ prices: i.prices }, market.currency) : i.currency === market.currency ? i.unitPrice : null;
      return price != null
        ? { ...i, unitPrice: price, currency: market.currency, available: true }
        : { ...i, available: false };
    });
    const count = priced.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = priced.reduce((sum, i) => sum + (i.available ? i.unitPrice * i.quantity : 0), 0);
    return {
      items: priced,
      count,
      subtotal,
      currency: market.currency,
      add,
      setQuantity,
      remove,
      clear,
      // The cart's prices wait for the visitor's country, so they never flash in the wrong currency.
      ready: ready && marketReady,
    };
  }, [items, market.currency, add, setQuantity, remove, clear, ready, marketReady]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>.');
  return ctx;
}

export { formatMoney } from '@/lib/money';
