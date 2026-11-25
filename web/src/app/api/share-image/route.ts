import { directusToken, directusUrl } from '@/lib/env';
import { getSiteSettings } from '@/lib/site-content';

export const runtime = 'nodejs';
export const revalidate = 3600;

/**
 * GET /og-image.jpg (rewritten here in next.config.ts): the picture a shared
 * link shows when its page has no picture of its own (SHARE_IMAGE in lib/meta.ts). The file is chosen in the
 * CMS (Site settings → Share image) and served here as a 1200 × 630 JPEG, so
 * every page can point at one stable address and changing the picture needs
 * no deploy.
 */
export async function GET() {
  const { shareImage } = await getSiteSettings();
  const base = directusUrl();
  if (!shareImage || !base) return new Response('Not found', { status: 404 });

  const token = directusToken();
  const upstream = await fetch(`${base}/assets/${shareImage}?width=1200&height=630&fit=cover&format=jpg&quality=85`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate: 3600 },
  }).catch(() => null);

  const type = upstream?.headers.get('content-type') || '';
  if (!upstream?.ok || !upstream.body || !type.startsWith('image/')) {
    void upstream?.body?.cancel().catch(() => {});
    return new Response('Not found', { status: 404 });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
