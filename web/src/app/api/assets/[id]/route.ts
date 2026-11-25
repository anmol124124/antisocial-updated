import { directusUrl, directusToken } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * GET /api/assets/:id?width=&height=&quality=&fit=&format=
 *
 * Streams a Directus file through this app instead of linking the browser
 * straight at the CMS. Two reasons:
 *
 *  - the Directus token stays server-side, so images work even when the
 *    collections are not publicly readable (which is the normal state of a
 *    fresh local Directus);
 *  - the CMS hostname never appears in the page, so moving the CMS is an env
 *    change rather than a content migration.
 *
 * Only raster images and MP4/WebM video are passed on (no SVG, no documents),
 * so files people upload with a form can never be opened through this route.
 * Video is streamed as stored, with the browser's Range requests forwarded so
 * it can start playing and seek without downloading the whole file.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only Directus' own transform parameters are forwarded; anything else in the
// query string is dropped rather than passed through to the CMS.
const ALLOWED = ['width', 'height', 'quality', 'fit', 'format', 'withoutEnlargement'];

const VIDEO = new Set(['video/mp4', 'video/webm']);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID.test(id)) {
    return new Response('Not found', { status: 404 });
  }

  const base = directusUrl();
  if (!base) {
    return new Response('DIRECTUS_URL is not set.', { status: 503 });
  }

  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = incoming.get(key);
    if (value) forwarded.set(key, value);
  }

  const token = directusToken();
  const range = request.headers.get('range');

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/assets/${id}?${forwarded}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(range && !forwarded.size ? { Range: range } : {}),
      },
      // Directus already handles transform caching; we cache the result below.
      cache: 'no-store',
    });
  } catch (err) {
    console.warn(`[assets] could not reach Directus for ${id}:`, err);
    return new Response('Upstream unavailable', { status: 502 });
  }

  // A body we won't send is dropped without waiting: under Next's fetch it can
  // be one half of a tee, and cancelling that only settles once the other half
  // is read, which would hold the visitor's request open until it times out.
  const discard = () => void upstream.body?.cancel().catch(() => {});

  if (!upstream.ok || !upstream.body) {
    discard();
    return new Response('Not found', { status: upstream.status === 403 ? 403 : 404 });
  }

  // Raster images only. The CMS also holds private uploads (organisers'
  // proposal documents) that must never be downloadable through a public URL,
  // and an SVG served from this origin could carry script.
  const contentType = upstream.headers.get('content-type') || '';
  const isImage = contentType.startsWith('image/') && !contentType.includes('svg');
  // Video only untransformed: Directus' transform parameters are for images.
  const isVideo = VIDEO.has(contentType.split(';')[0].trim()) && !forwarded.size;
  if (!isImage && !isVideo) {
    discard();
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers({
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  });
  if (isVideo) {
    headers.set('Accept-Ranges', 'bytes');
    for (const name of ['content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
  }

  return new Response(upstream.body, { status: isVideo && upstream.status === 206 ? 206 : 200, headers });
}
