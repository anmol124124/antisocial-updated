import 'server-only';
import { directusUrl, directusToken } from './env';

const revalidateSeconds = 60;

/** GET /items/<collection> with the site token, cached for `revalidateSeconds`. Null on any failure. */
async function readData<T>(collection: string, query: Record<string, string | number | undefined>): Promise<T | null> {
  const base = directusUrl();
  if (!base) {
    warnOnce(collection, 'DIRECTUS_URL is not set in .env.local');
    return null;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }

  const url = `${base}/items/${collection}${params.size ? `?${params}` : ''}`;
  const token = directusToken();

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      next: { revalidate: revalidateSeconds, tags: [`directus:${collection}`] },
    });

    if (!res.ok) {
      warnOnce(collection, `${res.status} ${res.statusText}`);
      return null;
    }

    const body = (await res.json()) as { data?: T };
    return body.data ?? null;
  } catch (err) {
    warnOnce(collection, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function readItems<T>(
  collection: string,
  query: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const data = await readData<T[]>(collection, query);
  return Array.isArray(data) ? data : [];
}

/** A singleton collection (one record, e.g. site_settings). Null when unreadable or never filled in. */
async function readSingleton<T>(
  collection: string,
  query: Record<string, string | number | undefined> = {},
): Promise<T | null> {
  const data = await readData<T>(collection, query);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

const warned = new Set<string>();
function warnOnce(collection: string, message: string) {
  const key = `${collection}:${message}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    `[directus] could not read "${collection}": ${message} — rendering the empty state. ` +
      `Check DIRECTUS_URL / DIRECTUS_TOKEN in web/.env.local and that the website policy can read the collection.`,
  );
}

/**
 * Turn a Directus file id into an image URL.
 *
 * Points at this app's own /api/assets proxy rather than at the CMS, so the
 * Directus token stays server-side and images keep working whether or not the
 * collections are publicly readable. See app/api/assets/[id]/route.ts.
 */
export function assetUrl(
  fileId: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; fit?: 'cover' | 'contain' } = {},
): string | null {
  if (!fileId) return null;
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  params.set('quality', String(opts.quality ?? 82));
  params.set('fit', opts.fit ?? 'cover');
  params.set('format', 'webp');
  return `/api/assets/${fileId}?${params}`;
}

/**
 * Create one row with the site's token. Runs server-side only, so the CMS URL
 * and token are never exposed. The site's policy can create but not read these
 * collections, so Directus answers 204 with no body — nothing is returned.
 */
export async function createItem(collection: string, payload: Record<string, unknown>): Promise<void> {
  const base = directusUrl();
  if (!base) throw new Error('DIRECTUS_URL is not set — cannot record the submission.');

  const token = directusToken();
  const res = await fetch(`${base}/items/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Directus rejected the new "${collection}" row (${res.status}). ` +
        `Check the website policy has Create on "${collection}". ${detail.slice(0, 300)}`,
    );
  }
}

/** POST a community-form submission. */
export function createSubmission(payload: Record<string, unknown>): Promise<void> {
  return createItem('submissions', payload);
}

/** Upload one file (e.g. an organiser's proposal) and return its Directus id. */
export async function uploadFile(file: File, title: string): Promise<string> {
  const base = directusUrl();
  if (!base) throw new Error('DIRECTUS_URL is not set — cannot upload the file.');

  const form = new FormData();
  form.append('title', title);
  // Directus requires `file` to be the last part of the multipart body.
  form.append('file', file, file.name);

  const token = directusToken();
  const res = await fetch(`${base}/files`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as { data?: { id?: string } } | null;
  if (!res.ok || !body?.data?.id) {
    throw new Error(`Directus rejected the upload (${res.status}). Check the website policy has Create on files.`);
  }
  return body.data.id;
}

export { readItems, readSingleton };

/* ───────────── server-side records (orders, bookings) ───────────── */

async function call<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const base = directusUrl();
  if (!base) throw new Error('DIRECTUS_URL is not set.');
  const token = directusToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Directus ${init.method || 'GET'} ${path.split('?')[0]} failed (${res.status}). ${text.slice(0, 300)}`);
  }
  return text ? ((JSON.parse(text) as { data?: T }).data ?? null) : null;
}

/**
 * Create a row and return its id. Only works where the site's policy can also
 * read the collection (orders, event_registrations); otherwise Directus
 * answers 204 and there is no id to return.
 */
export async function insertItem(collection: string, payload: Record<string, unknown>): Promise<number> {
  const row = await call<{ id: number }>(`/items/${collection}?fields=id`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!row?.id) throw new Error(`Directus created the "${collection}" row but returned no id. Check the website policy can read it.`);
  return row.id;
}

export async function updateItem(collection: string, id: number, payload: Record<string, unknown>): Promise<void> {
  await call(`/items/${collection}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/** Uncached read that throws on failure, for money and seat counts. */
export async function queryItems<T>(collection: string, query: Record<string, string>): Promise<T[]> {
  const rows = await call<T[]>(`/items/${collection}?${new URLSearchParams(query)}`);
  return Array.isArray(rows) ? rows : [];
}
