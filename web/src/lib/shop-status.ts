/**
 * Whether the shop takes orders. With NEXT_PUBLIC_SHOP_OPEN=false the products
 * and their pages still show, but buying is replaced by "Coming Soon", the
 * cart is hidden and /cart and /checkout send visitors back to /shop.
 * Read at build time (it is a NEXT_PUBLIC_ value), so rebuild after changing it.
 */
export function shopIsOpen(): boolean {
  return process.env.NEXT_PUBLIC_SHOP_OPEN !== 'false';
}
