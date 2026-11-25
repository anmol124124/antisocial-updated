/**
 * Cart limits, shared by the cart in the browser and the server that prices
 * it, so the cart never shows a quantity the checkout would charge differently.
 * Plain module: usable from server and client code.
 */
export const MAX_LINES = 20;
export const MAX_QUANTITY = 25;

/** A quantity as the cart keeps it: a whole number from 1 to MAX_QUANTITY. */
export function clampQuantity(quantity: unknown): number {
  return Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(quantity)) || 1));
}
