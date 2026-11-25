/**
 * POST to one of the site's own API routes from the browser and get its JSON
 * reply. Throws an Error whose message can be shown to the visitor as is: the
 * route's own `error` when it gave one, otherwise a plain sentence. Never
 * "Failed to fetch" or "Unexpected token '<'": nginx answers with an HTML page
 * while the server restarts during a deploy, and when an upload is too big.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each form reads its own fields
export async function postApi(url: string, payload: FormData | Record<string, unknown>): Promise<Record<string, any>> {
  let res: Response;
  try {
    res = await fetch(
      url,
      payload instanceof FormData
        ? { method: 'POST', body: payload }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
  } catch {
    throw new Error('We couldn’t reach the site. Check your connection and try again.');
  }

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && body) return body;
  if (typeof body?.error === 'string' && body.error) throw new Error(body.error);
  throw new Error(
    res.status === 413
      ? 'That file is too large to send. Please use one under 10 MB.'
      : 'Something went wrong on our side. Please try again in a moment.',
  );
}
