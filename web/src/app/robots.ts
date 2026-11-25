import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';

/**
 * Staging must never be indexed — a stage copy ranking alongside the real site
 * splits its SEO and leaks unfinished work. Anything whose host is not the
 * production domain is treated as staging and disallowed outright.
 */
function isProduction(host: string): boolean {
  return host === 'antisocialtalks.com' || host === 'www.antisocialtalks.com';
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  let host = '';
  try {
    host = new URL(base).hostname;
  } catch {
    /* leave blank -> treated as staging */
  }

  if (!isProduction(host)) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    // Private invitation pages carry noindex too; this keeps crawlers off them altogether.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/cart', '/checkout', '/payment', '/invite/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
