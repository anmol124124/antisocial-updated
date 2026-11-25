import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/env';

/**
 * Staging must never be indexed: a stage copy ranking alongside the real site
 * splits its SEO and leaks unfinished work. Only the live site sets
 * SITE_INDEXABLE=true (see isIndexable); everything else is disallowed outright.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    // Private invitation pages carry noindex too; this keeps crawlers off them altogether.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/cart', '/checkout', '/payment', '/invite/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
