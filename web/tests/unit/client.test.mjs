// The browser side of the forms and checkout (lib/api-client), with a
// stand-in for the site's API routes.

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const { postApi } = await import('@/lib/api-client');

let original;

const reply = (status, body) => () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  if (original) globalThis.fetch = original;
});

describe('postApi (the forms’ calls to the site)', () => {
  let sent;
  const answer = (respond) => {
    original = globalThis.fetch;
    sent = [];
    globalThis.fetch = async (url, init) => {
      sent.push({ url, init });
      return respond();
    };
  };
  const html = (status) => () => new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', { status, headers: { 'Content-Type': 'text/html' } });

  test('JSON goes out as JSON, and the reply comes back', async () => {
    answer(reply(200, { ok: true, message: 'You’re on the list.' }));
    assert.deepEqual(await postApi('/api/submissions', { type: 'community', email: 'a@b.co' }), { ok: true, message: 'You’re on the list.' });
    assert.equal(sent[0].init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(sent[0].init.body), { type: 'community', email: 'a@b.co' });
  });

  test('a form with a file goes out as multipart', async () => {
    answer(reply(200, { ok: true }));
    const form = new FormData();
    form.append('type', 'organiser');
    await postApi('/api/chapters/apply', form);
    assert.equal(sent[0].init.body, form);
    assert.equal(sent[0].init.headers, undefined, 'the browser sets the multipart boundary itself');
  });

  test('the route’s own error message is shown', async () => {
    answer(reply(409, { error: 'Only 1 place is left.' }));
    await assert.rejects(postApi('/api/chapters/register', {}), { message: 'Only 1 place is left.' });
  });

  test('nginx’s HTML error page during a restart: a plain sentence, not a JSON parse error', async () => {
    answer(html(502));
    await assert.rejects(postApi('/api/submissions', {}), (err) => {
      assert.doesNotMatch(err.message, /Unexpected token|JSON/);
      assert.match(err.message, /try again in a moment/);
      return true;
    });
  });

  test('an upload nginx finds too big', async () => {
    answer(html(413));
    await assert.rejects(postApi('/api/chapters/apply', new FormData()), { message: /too large/ });
  });

  test('offline: says so, instead of “Failed to fetch”', async () => {
    answer(() => Promise.reject(new TypeError('Failed to fetch')));
    await assert.rejects(postApi('/api/submissions', {}), { message: /couldn’t reach the site/ });
  });
});
