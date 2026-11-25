import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import {
  eventSlug,
  getEvents,
  getEpisodes,
  getGuests,
  getShopProducts,
  slugify,
} from '@/lib/content';
import { WAYS } from '@/lib/community';
import { APPLICATIONS, COMMUNITY_OPTIONS } from '@/lib/chapters';

export const revalidate = 3600;

const STATIC_PATHS = [
  '',
  '/about',
  '/episodes',
  '/voices',
  '/stories',
  '/chapters',
  '/events',
  '/chapters/organise',
  '/chapters/start',
  '/chapters/become-a-leader',
  '/chapters/what-happens',
  '/chapters/how-to-start',
  '/chapters/discover-talent',
  '/chapters/how-to-organise',
  '/roadshow',
  '/terms',
  '/privacy',
  '/community',
  '/shop',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const [episodes, guests, events, products] = await Promise.all([
    getEpisodes(200),
    getGuests(200),
    getEvents(),
    getShopProducts(),
  ]);

  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    })),
    ...WAYS.map((way) => ({
      url: `${base}/community/${way.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...episodes.map((e) => ({
      url: `${base}/episodes/${slugify(e.title)}`,
      lastModified: e.publish_date ? new Date(e.publish_date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...guests.map((g) => ({
      url: `${base}/voices/${slugify(g.name)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...events.map((e) => ({
      url: `${base}/events/${eventSlug(e)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...COMMUNITY_OPTIONS.map((t) => ({
      url: `${base}/chapters/apply/${APPLICATIONS[t].slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...products.map((p) => ({
      url: `${base}/shop/${p.slug || slugify(p.title)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
