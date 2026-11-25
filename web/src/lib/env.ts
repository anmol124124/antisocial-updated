/**
 * Central place every secret is read from, so a missing value fails with a
 * sentence that says what to do rather than `undefined` three layers down.
 */

const PLACEHOLDER = 'REPLACE_WITH_YOUR_GELATO_API_KEY';

export function gelatoApiKey(): string {
  const key = process.env.GELATO_API_KEY;
  if (!key || key === PLACEHOLDER || key === 'your-gelato-api-key') {
    const err = new Error(
      'GELATO_API_KEY is not set. Put your key from https://dashboard.gelato.com (Store -> API keys) into web/.env.local, then restart the dev server.',
    );
    (err as Error & { status?: number }).status = 503;
    throw err;
  }
  return key;
}

export function gelatoIsConfigured(): boolean {
  try {
    gelatoApiKey();
    return true;
  } catch {
    return false;
  }
}

export const directusUrl = (): string =>
  (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/$/, '');

export const publicDirectusUrl = (): string =>
  (process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/$/, '');

export const directusToken = (): string => process.env.DIRECTUS_TOKEN || '';

export const shopCurrency = (): string => process.env.NEXT_PUBLIC_SHOP_CURRENCY || 'USD';

export const siteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.antisocialtalks.com').replace(/\/$/, '');
