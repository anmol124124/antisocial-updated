// The API routes, called directly with stand-ins for the CMS, Stripe, Gelato,
// Qikink and email (tests/support/mocks.mjs). Every outside call is routed to
// a stand-in, so these run offline and can check exactly what was sent.

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOP_ENV,
  captureConsole,
  createDirectus,
  createGelato,
  createMail,
  createQikink,
  createStripe,
  installFetch,
  postForm,
  postJson,
  setEnv,
  stripeSignature,
} from '../support/mocks.mjs';
import { ADDRESS, FILES, seed } from '../support/fixtures.mjs';

const routes = {
  market: await import('@/app/api/market/route'),
  assets: await import('@/app/api/assets/[id]/route'),
  submissions: await import('@/app/api/submissions/route'),
  apply: await import('@/app/api/chapters/apply/route'),
  register: await import('@/app/api/chapters/register/route'),
  quote: await import('@/app/api/gelato/quote/route'),
  checkout: await import('@/app/api/checkout/route'),
  confirm: await import('@/app/api/payments/confirm/route'),
  payHook: await import('@/app/api/webhooks/payment/route'),
  gelatoHook: await import('@/app/api/webhooks/gelato/route'),
  cron: await import('@/app/api/cron/orders/route'),
};
const { sendMail } = await import('@/lib/mailer');

const CRON_SECRET = 'cron-secret-0123456789abcdef';
const SITE = 'https://stage.antisocialtalks.com';

/* ───────────────────────────── harness ───────────────────────────── */

let cms, stripe, gelato, qikink, mail, net, logs;

function boot({ env = SHOP_ENV, failCreate = [], gelatoOptions = {}, qikinkOptions = {} } = {}) {
  setEnv({ ...env, CRON_SECRET: env.CRON_SECRET ?? CRON_SECRET });
  cms = createDirectus(seed(), { failCreate });
  stripe = createStripe();
  gelato = createGelato(gelatoOptions);
  qikink = createQikink(qikinkOptions);
  mail = createMail();
  net = installFetch({ directus: cms, stripe, gelato, qikink, mail });
  logs = captureConsole();
}

afterEach(() => {
  net?.restore();
  logs?.restore();
  net = logs = undefined;
});

const read = async (res) => {
  const r = await res;
  return { status: r.status, body: await r.json() };
};
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const row = (col, id) => cms.rows(col).find((r) => r.id === id);
const mailTo = (to) => mail.sent.filter((m) => m.to === to);
const subjects = () => mail.sent.map((m) => m.subject);

const TEE_S = { slug: 'tee-anti-bullshit', gelatoProductUid: 'tee_uid_s', quantity: 2 };
const PERSON = { full_name: 'Ada Lovelace', email: 'ada@example.com', phone: '+971 50 123 4567', city: 'Dubai', country: 'UAE', accepted_terms: true };
const INDIA = { address: ADDRESS.IN, method: 'qikink-standard' };

const openCheckout = ({ address = ADDRESS.US, items = [TEE_S], method = 'standard' } = {}) =>
  read(routes.checkout.POST(postJson('/api/checkout', { items, shippingAddress: address, shipmentMethodUid: method })));

/** The Stripe Checkout session behind a payment page URL. */
const sessionOf = (url) => url.split('/').pop();

const confirm = (sessionId) => read(routes.confirm.POST(postJson('/api/payments/confirm', { session_id: sessionId })));

function webhook(type, session, { secret = 'whsec_test', timestamp } = {}) {
  const raw = JSON.stringify({ id: 'evt_1', type, data: { object: { object: 'checkout.session', ...session } } });
  return read(
    routes.payHook.POST(
      new Request('http://site.test/api/webhooks/payment', { method: 'POST', headers: { 'stripe-signature': stripeSignature(raw, secret, timestamp) }, body: raw }),
    ),
  );
}

const cron = (secret = CRON_SECRET) =>
  read(routes.cron.POST(new Request('http://site.test/api/cron/orders', { method: 'POST', headers: secret ? { authorization: `Bearer ${secret}` } : {} })));

const register = (body) => read(routes.register.POST(postJson('/api/chapters/register', body)));

/** A shop order taken through checkout, payment on Stripe's page, and the return to the site. */
async function paidShopOrder(options) {
  const { body } = await openCheckout(options);
  const id = sessionOf(body.payment.url);
  stripe.pay(id);
  const result = await confirm(id);
  assert.equal(result.body.state, 'paid', 'set-up: the order is paid');
  return cms.rows('orders').find((o) => o.stripe_session_id === id);
}

/** A paid booking for the INR 499 talk. */
async function paidTicket(attendees = 2) {
  const { body } = await register({ event: 'paid-talk', ...PERSON, attendees: String(attendees) });
  const id = sessionOf(body.payment.url);
  stripe.pay(id);
  await confirm(id);
  return cms.rows('orders').find((o) => o.stripe_session_id === id);
}

/* ───────────────────────────── market ───────────────────────────── */

describe('GET /api/market', () => {
  const ask = (country) =>
    read(routes.market.GET(new Request('http://site.test/api/market', { headers: country ? { 'cf-ipcountry': country } : {} })));

  test('Cloudflare’s country picks the market', async () => {
    assert.deepEqual((await ask('AE')).body, { market: 'AE', country: 'AE' });
    assert.deepEqual((await ask('IN')).body, { market: 'IN', country: 'IN' });
    assert.deepEqual((await ask('CA')).body, { market: 'CA', country: 'CA' });
    assert.deepEqual((await ask('DE')).body, { market: 'US', country: 'DE' }, 'anywhere else shops in USD');
  });

  test('unknown, Tor or missing country leaves it to the browser', async () => {
    for (const c of [undefined, 'XX', 'T1']) assert.deepEqual((await ask(c)).body, { market: null });
  });
});

/* ───────────────────────────── assets ───────────────────────────── */

describe('GET /api/assets/:id', () => {
  const get = (id, query = '') =>
    routes.assets.GET(new Request(`http://site.test/api/assets/${id}${query}`), { params: Promise.resolve({ id }) });

  test('streams an image with safe headers and only Directus’ transform parameters', async () => {
    boot();
    const res = await get(FILES.mockup, '?width=400&format=webp&access_token=stolen&download=1');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('cache-control'), /public/);
    const sent = cms.log.at(-1);
    assert.equal(sent.path, `/assets/${FILES.mockup}`);
    assert.deepEqual(sent.query, { width: '400', format: 'webp' });
  });

  test('private documents and SVGs are never served', async () => {
    boot();
    assert.equal((await get(FILES.proposal)).status, 404, 'organiser proposal PDF');
    assert.equal((await get(FILES.svg)).status, 404, 'SVG could carry script');
  });

  test('bad or unknown ids are a 404 without asking the CMS', async () => {
    boot();
    assert.equal((await get('../items/orders')).status, 404);
    assert.equal(cms.log.length, 0);
    assert.equal((await get('99999999-9999-4999-8999-999999999999')).status, 404);
  });
});

/* ───────────────────────────── community forms ───────────────────────────── */

describe('POST /api/submissions', () => {
  const submit = (body) => read(routes.submissions.POST(postJson('/api/submissions', body)));

  test('newsletter sign-up: only known fields reach the CMS, and the team hears about it', async () => {
    boot();
    const r = await submit({ type: 'community', email: ' fan@example.com ', interest: 'newsletter', consent_email: true, reviewed: true, admin: 'yes' });
    assert.deepEqual(r, { status: 200, body: { ok: true } });
    const [saved] = cms.rows('submissions');
    assert.equal(saved.email, 'fan@example.com');
    assert.equal(saved.reviewed, false, 'the visitor cannot mark it reviewed');
    assert.equal(saved.consent_email, true);
    assert.equal('admin' in saved, false);
    const [team] = mailTo('team@antisocialtalks.com');
    assert.equal(team.replyTo, 'fan@example.com');
    assert.match(team.text, /Email updates: yes/);
  });

  test('consent is only true when ticked', async () => {
    boot();
    await submit({ type: 'story', email: 'a@b.co', message: 'A story worth telling.', consent_email: 'yes' });
    assert.equal(cms.rows('submissions')[0].consent_email, false);
  });

  test('bots, unknown forms, bad emails and empty messages are turned away', async () => {
    boot();
    assert.equal((await submit({ type: 'story', email: 'a@b.co', message: 'Long enough message.', website: 'spam.example' })).status, 200);
    assert.equal(cms.rows('submissions').length, 0, 'honeypot: nothing saved');
    assert.equal((await submit({ type: 'admin', email: 'a@b.co' })).status, 400);
    assert.equal((await submit({ type: 'story', email: 'not-an-email', message: 'Long enough message.' })).status, 400);
    assert.equal((await submit({ type: 'story', email: 'a@b.co', message: 'short' })).status, 400);
  });

  test('a CMS failure is logged, not shown to the visitor', async () => {
    boot({ failCreate: ['submissions'] });
    const r = await submit({ type: 'question', email: 'a@b.co', message: 'What is the next episode?' });
    assert.equal(r.status, 502);
    assert.doesNotMatch(r.body.error, /Directus|permission|policy|403/i);
    assert.ok(logs.lines.some((l) => /permission/.test(l)), 'detail is in the log');
  });
});

/* ───────────────────────────── chapter applications ───────────────────────────── */

describe('POST /api/chapters/apply', () => {
  const apply = (fields) => read(routes.apply.POST(postForm('/api/chapters/apply', fields)));
  const FOUNDER = {
    type: 'chapter_founder',
    full_name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+1 212 555 0100',
    city: 'Toronto',
    country: 'Canada',
    why_mission: 'Because silence costs.',
    team_type: 'alone',
    chapter_plans: 'Monthly talks.',
    first_steps: 'Venue at the library.',
    accepted_privacy: 'on',
    accepted_review: 'on',
  };
  const ORGANISER = {
    type: 'organiser',
    full_name: 'Omar K',
    email: 'omar@example.com',
    phone: '+971 50 123 4567',
    city: 'Dubai',
    country: 'UAE',
    event_title: 'Unfiltered Dubai',
    theme: 'Work',
    concept: 'A night of honest talks.',
    preferred_timeframe: 'March 2027',
    audience_size: '80–120',
    intended_audience: 'Founders',
    format: 'panel',
    experience: 'Ran a TEDx.',
    venue_availability: 'Confirmed',
    accepted_privacy: 'on',
    accepted_review: 'on',
  };
  const pdf = (bytes = 2048, type = 'application/pdf') => new File([new Uint8Array(bytes)], 'proposal.pdf', { type });

  test('Start a Chapter: saved as pending, applicant and team emailed', async () => {
    boot();
    const r = await apply(FOUNDER);
    assert.equal(r.status, 200);
    assert.match(r.body.message, /founder orientation call/);
    const [saved] = cms.rows('applications');
    assert.equal(saved.type, 'chapter_founder');
    assert.equal(saved.status, 'pending');
    assert.equal(saved.city, 'Toronto');
    assert.equal(saved.accepted_privacy, true);
    assert.equal(saved.marketing_opt_in, false);
    assert.equal(saved.attachment, null);
    assert.equal('accepted_review' in saved, false, 'form-only tick boxes are not stored as fields');
    assert.deepEqual(subjects().sort(), ['New application: Start a Chapter', 'We’ve received your application: Start a Chapter']);
  });

  test('the review and privacy boxes must be ticked; select values must be real options', async () => {
    boot();
    assert.match((await apply({ ...FOUNDER, accepted_review: '' })).body.error, /tick the confirmation/);
    assert.match((await apply({ ...FOUNDER, accepted_privacy: '' })).body.error, /privacy/);
    assert.equal((await apply({ ...FOUNDER, team_type: 'maybe' })).status, 400);
    assert.equal((await apply({ ...FOUNDER, type: 'admin' })).status, 400);
    assert.equal(cms.rows('applications').length, 0);
  });

  test('Nominate a Voice needs the nominee consent box', async () => {
    boot();
    const NOMINATION = {
      type: 'speaker', nomination_type: 'other', nominee_name: 'Grace H', city: 'Pune', country: 'India', topic: 'Debugging society',
      why_it_matters: 'Because.', bio: 'Engineer.', spoken_before: 'no', full_name: 'Ada', email: 'ada@example.com', phone: '+91 99999 99999',
      accepted_privacy: 'on',
    };
    assert.equal((await apply(NOMINATION)).status, 400);
    const r = await apply({ ...NOMINATION, accepted_review: 'on' });
    assert.equal(r.status, 200);
    assert.equal(cms.rows('applications')[0].nominee_name, 'Grace H');
  });

  test('organiser proposal: a PDF is uploaded and linked; big or wrong files are refused', async () => {
    boot();
    assert.match((await apply({ ...ORGANISER, attachment: pdf(10 * 1024 * 1024 + 1) })).body.error, /larger than 10 MB/);
    assert.match((await apply({ ...ORGANISER, attachment: pdf(100, 'image/png') })).body.error, /PDF, Word or PowerPoint/);
    assert.equal(cms.files.size, 0);

    const r = await apply({ ...ORGANISER, attachment: pdf() });
    assert.equal(r.status, 200);
    const [file] = [...cms.files.values()];
    assert.equal(file.type, 'application/pdf');
    assert.equal(file.title, 'Proposal from Omar K');
    assert.equal(cms.rows('applications')[0].attachment, file.id);
  });

  test('other forms ignore an attached file', async () => {
    boot();
    await apply({ ...FOUNDER, attachment: pdf() });
    assert.equal(cms.files.size, 0);
    assert.equal(cms.rows('applications')[0].attachment, null);
  });

  test('honeypot: thanked, not saved', async () => {
    boot();
    assert.equal((await apply({ ...FOUNDER, website: 'x' })).status, 200);
    assert.equal(cms.rows('applications').length, 0);
    assert.equal(mail.sent.length, 0);
  });
});

/* ───────────────────────────── event registration ───────────────────────────── */

describe('POST /api/chapters/register', () => {
  test('unknown and draft events are not found', async () => {
    boot();
    assert.equal((await register({ event: 'nope', ...PERSON })).status, 404);
    assert.equal((await register({ event: 'india-upcoming-chapter-event', ...PERSON })).status, 404);
  });

  test('a Coming Soon event takes interest, without a head count', async () => {
    boot();
    const r = await register({ event: 'coming-soon-talk', ...PERSON, attendees: '4' });
    assert.equal(r.status, 200);
    assert.match(r.body.message, /on the list/);
    const [saved] = cms.rows('event_registrations');
    assert.equal(saved.kind, 'interest');
    assert.equal(saved.status, 'received');
    assert.equal(saved.payment_status, 'not_required');
    assert.equal('attendees' in saved, false);
  });

  test('an invitation event takes RSVPs for review: who you are, no head count, no capacity limit', async () => {
    boot();
    const rsvp = (extra) => register({ event: 'invitation-talk', ...PERSON, ...extra });
    assert.match((await rsvp({})).body.error, /Organisation/);
    for (let i = 0; i < 3; i++) {
      assert.equal((await rsvp({ organisation: 'Acme', job_title: 'Founder', attendees: '5' })).status, 200);
    }
    const rows = cms.rows('event_registrations');
    assert.equal(rows.length, 3, 'a capacity of 2 does not stop RSVPs: the team picks the guests');
    assert.deepEqual(
      [rows[0].kind, rows[0].status, rows[0].payment_status, rows[0].organisation, rows[0].job_title],
      ['rsvp', 'received', 'not_required', 'Acme', 'Founder'],
    );
    assert.equal('attendees' in rows[0], false);
    const confirmation = mailTo('ada@example.com')[0];
    assert.match(confirmation.subject, /^Your RSVP is in: Invitation Talk/);
    assert.match(confirmation.text, /email you the venue and the details/);
    assert.ok(subjects().includes('New RSVP: Invitation Talk'));
  });

  test('an invite-only event takes no public registrations: nothing saved, nothing sent', async () => {
    boot();
    const r = await register({ event: 'private-talk', ...PERSON, organisation: 'Acme', job_title: 'Founder' });
    assert.equal(r.status, 403);
    assert.match(r.body.error, /private event/);
    assert.equal(cms.rows('event_registrations').length, 0);
    assert.equal(mailTo('ada@example.com').length, 0);
  });

  test('an event whose date has passed takes nothing, by form or by invitation, even if the CMS was not updated', async () => {
    boot();
    const form = await register({ event: 'past-talk', ...PERSON, organisation: 'Acme', job_title: 'Founder' });
    assert.equal(form.status, 409);
    assert.match(form.body.error, /completed/);
    const invited = await register({ event: 'past-talk', invite: 'past-talk-invite-3n8q', ...PERSON, organisation: 'Acme', job_title: 'Founder' });
    assert.equal(invited.status, 409);
    assert.equal(cms.rows('event_registrations').length, 0);
    assert.equal(mailTo('ada@example.com').length, 0);
  });

  describe('a private invitation link', () => {
    const CODE = 'private-talk-invite-7k2m';
    const GUEST = { ...PERSON, organisation: 'Acme', job_title: 'Founder' };
    const accept = (extra) => register({ event: 'private-talk', invite: CODE, ...GUEST, ...extra });

    test('puts the guest on the list and emails their invitation, with the venue and a calendar entry', async () => {
      boot();
      const r = await accept({ email: 'Ada@Example.com' });
      assert.equal(r.status, 200);
      assert.match(r.body.message, /invitation is on its way to ada@example\.com/);

      const [saved] = cms.rows('event_registrations');
      assert.deepEqual([saved.event, saved.kind, saved.status, saved.email, saved.organisation], [7, 'invite', 'confirmed', 'ada@example.com', 'Acme']);
      assert.match(saved.guest_key, /^[0-9a-f]{40}$/);

      const [invitation] = mailTo('ada@example.com');
      assert.equal(invitation.subject, 'You’re invited: Private Talk');
      assert.equal(invitation.replyTo, 'team@antisocialtalks.com');
      for (const s of ['You’re invited.', 'Hi Ada,', 'The Secret Room, 1 Hidden Lane, London', 'Arrive by 11:15 AM.<br>Bring photo ID.', '11:30 AM – 3:00 PM GMT', 'https://stage.antisocialtalks.com/events/private-talk']) {
        assert.ok(invitation.html.includes(s), `invitation email: missing “${s}”`);
      }
      const [ics] = invitation.attachments;
      assert.equal(ics.name, 'private-talk.ics');
      const calendar = Buffer.from(ics.content, 'base64').toString('utf8');
      for (const s of ['BEGIN:VEVENT', 'DTSTART:20991103T113000Z', 'DTEND:20991103T150000Z', 'SUMMARY:Private Talk', 'LOCATION:The Secret Room\\, 1 Hidden Lane\\, London']) {
        assert.ok(calendar.includes(s), `calendar entry: missing “${s}”`);
      }
      assert.ok(calendar.split('\r\n').every((line) => Buffer.byteLength(line) <= 75), 'calendar lines must be folded at 75 bytes');

      const team = mail.sent.find((m) => m.subject === 'New guest (invitation link): Private Talk');
      assert.ok(team, 'the team is told about the new guest');
      assert.match(team.text, /Organisation: Acme[\s\S]*Invitation email: sent/);
    });

    test('accepting twice adds no second guest; the invitation is sent again', async () => {
      boot();
      await accept();
      const again = await accept({ email: 'ADA@example.com ' });
      assert.equal(again.status, 200);
      assert.match(again.body.message, /already on the guest list/);
      assert.equal(cms.rows('event_registrations').length, 1);
      assert.equal(mailTo('ada@example.com').length, 2);
      assert.equal(subjects().filter((s) => s.startsWith('New guest')).length, 1, 'the team hears about a guest once');
    });

    test('a wrong or short code is refused: nothing saved, nothing sent', async () => {
      boot();
      for (const invite of ['private-talk-invite-0000', 'short', '']) {
        const r = await accept({ invite });
        assert.equal(r.status, 403);
        assert.match(r.body.error, /invitation link is not valid/);
      }
      assert.equal(cms.rows('event_registrations').length, 0);
      assert.equal(mail.sent.length, 0);
    });

    test('a full guest list and a finished event turn new guests away', async () => {
      boot();
      row('events', 7).capacity = 1;
      assert.equal((await accept()).status, 200);
      const full = await accept({ email: 'grace@example.com' });
      assert.equal(full.status, 409);
      assert.match(full.body.error, /guest list is full/);

      row('events', 7).status = 'completed';
      const closed = await accept({ email: 'alan@example.com' });
      assert.equal(closed.status, 409);
      assert.equal(cms.rows('event_registrations').length, 1);
    });

    test('without mail set up, the guest is still on the list and the team is told to send it by hand', async () => {
      boot({ env: { ...SHOP_ENV, MS_TENANT_ID: '', MS_CLIENT_ID: '', MS_CLIENT_SECRET: '' } });
      const r = await accept();
      assert.equal(r.status, 200);
      assert.match(r.body.message, /team will email you your invitation shortly/);
      assert.equal(cms.rows('event_registrations').length, 1);
    });
  });

  test('an event whose details are still coming takes no registrations yet', async () => {
    boot();
    const r = await register({ event: 'soon-talk', ...PERSON });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /coming soon/);
    assert.equal(cms.rows('event_registrations').length, 0);
    assert.equal(mailTo('ada@example.com').length, 0);
  });

  test('an early-bird event takes interest, like Coming Soon', async () => {
    boot();
    const r = await register({ event: 'early-bird-talk', ...PERSON });
    assert.equal(r.status, 200);
    const [saved] = cms.rows('event_registrations');
    assert.deepEqual([saved.kind, saved.status], ['interest', 'received']);
  });

  test('terms must be accepted', async () => {
    boot();
    const r = await register({ event: 'dubai-upcoming-chapter-event', ...PERSON, attendees: '1', accepted_terms: false });
    assert.equal(r.status, 400);
  });

  test('free booking stops at capacity (3 places)', async () => {
    boot();
    const book = (n) => register({ event: 'dubai-upcoming-chapter-event', ...PERSON, attendees: String(n) });
    assert.equal((await book(2)).status, 200);
    assert.equal(cms.rows('event_registrations')[0].status, 'confirmed');
    assert.deepEqual((await book(2)).body, { error: 'Only 1 place is left.' });
    assert.equal((await book(1)).status, 200);
    assert.deepEqual((await book(1)).body, { error: 'This event is now full.' });
    const confirmation = mailTo('ada@example.com')[0];
    assert.equal(confirmation.subject, 'Your place is booked: Dubai Event');
    assert.match(confirmation.text, /Places: 2/);
  });

  test('paid booking holds the places and opens a Stripe payment page for the total', async () => {
    boot();
    const r = await register({ event: 'paid-talk', ...PERSON, attendees: '2' });
    assert.equal(r.status, 200);
    const session = stripe.sessions.get(sessionOf(r.body.payment.url));
    assert.deepEqual(
      [session.amount_total, session.currency, session.lines[0].unit_amount, session.lines[0].quantity],
      [99800, 'inr', 49900, 2],
    );
    assert.equal(session.success_url, `${SITE}/payment/complete?session_id={CHECKOUT_SESSION_ID}`);
    assert.equal(session.cancel_url, `${SITE}/events/paid-talk#register`);
    assert.ok(session.expires_at - Date.now() / 1000 <= 31 * 60 + 5, 'the payment page closes before the hold is released');

    const [registration] = cms.rows('event_registrations');
    assert.equal(registration.status, 'awaiting_payment');
    assert.equal(registration.payment_status, 'pending');
    const [order] = cms.rows('orders');
    assert.equal(order.kind, 'ticket');
    assert.equal(order.amount, 998);
    assert.equal(order.amount_minor, 99800);
    assert.equal(order.registration, registration.id);
    assert.equal(order.stripe_session_id, session.id);
    assert.equal(session.client_reference_id, `AST-${order.id}`);
    assert.equal(mail.sent.length, 0, 'nothing is confirmed before the money');
  });

  test('paying confirms the place and emails the receipt', async () => {
    boot();
    const order = await paidTicket(2);
    assert.equal(order.status, 'paid');
    assert.match(order.stripe_payment_intent, /^pi_/);
    const registration = row('event_registrations', order.registration);
    assert.equal(registration.status, 'confirmed');
    assert.equal(registration.payment_status, 'paid');
    const receipt = mailTo('ada@example.com')[0];
    assert.match(receipt.subject, /^Booking confirmed: Paid Talk/);
    assert.match(receipt.text, /₹998\.00/);
  });

  test('an unpaid hold keeps its places for 35 minutes, longer than the payment page lives', async () => {
    boot();
    const book = (n) => register({ event: 'paid-talk', ...PERSON, attendees: String(n) });
    assert.equal((await book(9)).status, 200);
    assert.deepEqual((await book(2)).body, { error: 'Only 1 place is left.' });
    cms.rows('event_registrations')[0].date_created = minutesAgo(36);
    assert.equal((await book(2)).status, 200, 'the expired hold frees its places');
  });

  test('paid events: at most 10 places per booking, and closed while payments are off', async () => {
    boot();
    assert.match((await register({ event: 'paid-talk', ...PERSON, attendees: '11' })).body.error, /up to 10 places/);
    boot({ env: { ...SHOP_ENV, PAYMENT_GATEWAY: 'none' } });
    const r = await register({ event: 'paid-talk', ...PERSON, attendees: '1' });
    assert.equal(r.status, 503);
    assert.equal(cms.rows('event_registrations').length, 0);
  });
});

/* ───────────────────────────── delivery quote ───────────────────────────── */

describe('POST /api/gelato/quote', () => {
  const quote = (address, items = [TEE_S]) => read(routes.quote.POST(postJson('/api/gelato/quote', { shippingAddress: address, items })));

  test('quotes in the delivery country’s currency and returns only the delivery options', async () => {
    boot();
    const r = await quote(ADDRESS.US);
    assert.equal(r.status, 200);
    assert.equal(r.body.currency, 'USD');
    assert.deepEqual(r.body.shipmentMethods.map((m) => [m.shipmentMethodUid, m.price, m.currency]), [
      ['standard', 5, 'USD'],
      ['express', 15, 'USD'],
    ]);
    assert.doesNotMatch(JSON.stringify(r.body), /productUid|"products"/, 'Gelato’s wholesale prices stay on the server');

    const [sent] = gelato.quotes;
    assert.equal(sent.currency, 'USD');
    assert.equal(sent.recipient.country, 'US');
    assert.deepEqual(sent.products[0].files.map((f) => f.type), ['front', 'back']);
    assert.equal(sent.products[0].productUid, 'tee_uid_s');
    assert.equal(sent.products[0].quantity, 2);
  });

  test('India: Qikink delivers for free, and Gelato is not asked', async () => {
    boot();
    const r = await quote(ADDRESS.IN);
    assert.deepEqual(r.body, {
      currency: 'INR',
      shipmentMethods: [{ name: 'Standard delivery', shipmentMethodUid: 'qikink-standard', price: 0, currency: 'INR', minDeliveryDays: 4, maxDeliveryDays: 8 }],
    });
    assert.equal(gelato.quotes.length, 0);
  });

  test('India: only the sizes Qikink makes, and the courier needs a mobile number and the state', async () => {
    boot();
    assert.match((await quote(ADDRESS.IN, [{ ...TEE_S, gelatoProductUid: 'tee_uid_m' }])).body.error, /\(Deep Black \/ M\)" isn’t available in India/);
    assert.match((await quote({ ...ADDRESS.IN, phone: '' })).body.error, /mobile number/);
    assert.match((await quote({ ...ADDRESS.IN, state: '' })).body.error, /state/);
    assert.equal((await quote({ ...ADDRESS.GB, phone: '' })).status, 200, 'no phone needed outside India');
  });

  test('only products, sizes and countries the shop sells', async () => {
    boot();
    assert.match((await quote(ADDRESS.US, [{ slug: 'india-only', quantity: 1 }])).body.error, /isn’t available in United States/);
    assert.equal((await quote(ADDRESS.IN, [{ slug: 'india-only', quantity: 1 }])).status, 200);
    assert.match((await quote(ADDRESS.US, [{ slug: 'retired', quantity: 1 }])).body.error, /no longer for sale/);
    assert.match((await quote(ADDRESS.US, [{ ...TEE_S, gelatoProductUid: 'tee_uid_xxl' }])).body.error, /choose the size/);
    assert.equal((await quote({ ...ADDRESS.US, country: 'FR' })).status, 400);
    assert.equal((await quote(ADDRESS.US, [])).status, 409);
    assert.equal((await quote(ADDRESS.US, Array.from({ length: 21 }, () => TEE_S))).status, 409);
  });

  test('closed while the shop is Coming Soon', async () => {
    boot({ env: { ...SHOP_ENV, NEXT_PUBLIC_SHOP_OPEN: 'false' } });
    assert.equal((await quote(ADDRESS.US)).status, 501);
    assert.equal(gelato.quotes.length, 0);
  });
});

/* ───────────────────────────── checkout ───────────────────────────── */

describe('POST /api/checkout', () => {
  test('prices come from the CMS and delivery from Gelato, whatever the browser sends', async () => {
    boot();
    const r = await openCheckout({ items: [{ ...TEE_S, unitPrice: 1, price: 1, currency: 'INR' }] });
    assert.equal(r.status, 200);
    const session = stripe.sessions.get(sessionOf(r.body.payment.url));
    assert.equal(session.amount_total, 8300, '2 × $39 + $5 delivery');
    assert.equal(session.currency, 'usd');
    assert.deepEqual(session.lines.map((l) => [l.name, l.unit_amount, l.quantity]), [
      ['Not Anti-Opinion Tee (Deep Black / S)', 3900, 2],
      ['Delivery', 500, 1],
    ]);
    assert.equal(session.customer_email, 'ada@example.com');
    assert.equal(session.cancel_url, `${SITE}/checkout`);

    const [order] = cms.rows('orders');
    assert.equal(order.status, 'pending');
    assert.equal(order.kind, 'shop');
    assert.equal(order.amount, 83);
    assert.equal(order.amount_minor, 8300);
    assert.equal(order.shipping_amount, 5);
    assert.equal(order.shipment_method_uid, 'standard');
    assert.equal(order.fulfilment_provider, 'gelato');
    assert.equal(order.customer_name, 'Ada Lovelace');
    assert.equal(order.stripe_session_id, session.id);
    assert.equal(session.client_reference_id, `AST-${order.id}`);
    assert.equal(stripe.log[0].idempotencyKey, `AST-${order.id}-checkout`, 'a retried request never opens a second payment');
    assert.deepEqual(order.lines.map((l) => [l.title, l.gelatoProductUid, l.unitPrice, l.quantity]), [
      ['Not Anti-Opinion Tee (Deep Black / S)', 'tee_uid_s', 39, 2],
    ]);
  });

  test('India: the rupee price, free delivery, and the Qikink product saved with the order', async () => {
    boot();
    const r = await openCheckout(INDIA);
    assert.equal(r.status, 200);
    const session = stripe.sessions.get(sessionOf(r.body.payment.url));
    assert.equal(session.amount_total, 799800, '2 × ₹3,999, delivery included');
    assert.equal(session.currency, 'inr');
    assert.deepEqual(session.lines.map((l) => l.name), ['Not Anti-Opinion Tee (Deep Black / S)'], 'no delivery line');

    const [order] = cms.rows('orders');
    assert.equal(order.fulfilment_provider, 'qikink');
    assert.equal(order.shipping_amount, 0);
    const { qikink: item } = order.lines[0];
    assert.equal(item.sku, 'USs-Bk-S');
    assert.equal(item.print_type_id, '1');
    assert.deepEqual(item.designs.map((d) => [d.placement_sku, d.width_inches, d.height_inches]), [
      ['fr', '11.25', '15'],
      ['bk', '11.25', '15'],
    ]);
    assert.equal(item.designs[0].design_link, `${SITE}/api/assets/${FILES.front}`);
    assert.equal(item.designs[0].mockup_link, `${SITE}/api/assets/${FILES.photo}`);
    assert.ok(item.designs.every((d) => d.design_code.length <= 20));
    assert.equal(gelato.quotes.length, 0);
  });

  test('outside India everyone pays in US dollars; express costs more; quantities are capped', async () => {
    boot();
    const session = async (options) => stripe.sessions.get(sessionOf((await openCheckout(options)).body.payment.url));
    for (const address of [ADDRESS.GB, ADDRESS.CA, { ...ADDRESS.GB, country: 'AE', city: 'Dubai', postCode: '00000' }]) {
      const s = await session({ address });
      assert.deepEqual([s.amount_total, s.currency], [8300, 'usd'], `${address.country}: 2 × $39 + $5`);
    }
    assert.ok(gelato.quotes.every((q) => q.currency === 'USD'), 'delivery is quoted in USD too');
    assert.equal((await session({ method: 'express' })).amount_total, 9300);
    assert.equal((await session({ items: [{ ...TEE_S, quantity: 1000 }] })).amount_total, 25 * 3900 + 500);
    assert.equal((await session({ items: [{ ...TEE_S, quantity: -3 }] })).amount_total, 3900 + 500);
  });

  test('Canada: a province is needed, and Gelato prints it there', async () => {
    boot();
    assert.match((await openCheckout({ address: { ...ADDRESS.CA, state: '' } })).body.error, /province/);
    const order = await paidShopOrder({ address: ADDRESS.CA });
    assert.equal(order.fulfilment_provider, 'gelato');
    const placed = gelato.orders.get(order.gelato_order_id).request;
    assert.deepEqual([placed.currency, placed.shippingAddress.country, placed.shippingAddress.state], ['USD', 'CA', 'ON']);
  });

  test('a delivery option must be chosen, and must be one that is offered', async () => {
    boot();
    assert.equal((await openCheckout({ method: '' })).status, 400);
    assert.equal((await openCheckout({ method: 'teleport' })).status, 409);
    assert.equal((await openCheckout({ address: ADDRESS.IN, method: 'standard' })).status, 409, 'India has Qikink delivery only');
    assert.equal(cms.rows('orders').length, 0);
  });

  test('a Stripe outage leaves a clear message', async () => {
    boot();
    stripe.handle = async () => new Response(JSON.stringify({ error: { message: 'Server error' } }), { status: 500 });
    const r = await openCheckout();
    assert.equal(r.status, 502);
    assert.match(r.body.error, /couldn’t start the payment/);
  });

  test('closed unless the shop is open and Stripe is set up', async () => {
    for (const env of [
      { ...SHOP_ENV, PAYMENT_GATEWAY: 'none' },
      { ...SHOP_ENV, PAYMENT_GATEWAY: 'razorpay' },
      { ...SHOP_ENV, STRIPE_SECRET_KEY: '' },
      { ...SHOP_ENV, NEXT_PUBLIC_SHOP_OPEN: 'false' },
    ]) {
      boot({ env });
      assert.equal((await openCheckout()).status, 501);
      assert.equal(stripe.sessions.size, 0);
    }
  });
});

/* ───────────────────────────── colours ───────────────────────────── */

describe('colours', () => {
  const line = (uid) => [{ slug: 'tee-anti-bullshit', gelatoProductUid: uid, quantity: 1 }];

  test('a teal tee prints the teal files on the teal Gelato product', async () => {
    boot();
    const order = await paidShopOrder({ items: line('tee_teal_m') });
    assert.equal(order.lines[0].title, 'Not Anti-Opinion Tee (Teal / M)');
    const placed = gelato.orders.get(order.gelato_order_id).request.items[0];
    assert.equal(placed.productUid, 'tee_teal_m');
    assert.deepEqual(placed.files.map((f) => [f.type, f.url]), [
      ['front', `${SITE}/api/assets/${FILES.tealFront}`],
      ['back', `${SITE}/api/assets/${FILES.back}`],
    ]);
  });

  test('a colour only Qikink makes is sold in India only, with its own SKU and pictures', async () => {
    boot();
    const sand = line('in:tee-anti-bullshit:sand:s');
    assert.match((await openCheckout({ items: sand })).body.error, /\(Sand \/ S\)" isn’t available in United States/);
    await paidShopOrder({ ...INDIA, items: sand });
    const [sent] = qikink.orders[0].request.line_items;
    assert.equal(sent.sku, 'USs-Sd-S');
    assert.equal(sent.designs[0].mockup_link, `${SITE}/api/assets/${FILES.sandMockup}`);
    assert.equal(sent.designs[0].design_link, `${SITE}/api/assets/${FILES.front}`, 'no print files of its own: the product’s');
    assert.equal(gelato.orders.size, 0);
  });

  test('a colour Qikink has no code for is not sold in India', async () => {
    boot();
    const r = await openCheckout({ ...INDIA, items: line('tee_teal_m') });
    assert.match(r.body.error, /\(Teal \/ M\)" isn’t available in India/);
    assert.equal(cms.rows('orders').length, 0);
  });
});

/* ───────────────────────────── payment confirmation ───────────────────────────── */

describe('POST /api/payments/confirm', () => {
  test('a paid order outside India goes to Gelato (as a draft on test keys) and both emails go out', async () => {
    boot();
    const order = await paidShopOrder();
    assert.equal(order.status, 'fulfilled');
    assert.match(order.stripe_payment_intent, /^pi_/);
    assert.match(order.notes, /Test payment/);

    const placed = gelato.orders.get(order.gelato_order_id);
    assert.equal(placed.orderType, 'draft');
    assert.equal(placed.request.orderReferenceId, `AST-${order.id}`);
    assert.equal(placed.request.currency, 'USD');
    assert.equal(placed.request.shipmentMethodUid, 'standard');
    assert.equal(placed.request.shippingAddress.country, 'US');
    assert.deepEqual(placed.request.items.map((i) => [i.productUid, i.quantity, i.files.map((f) => f.type).join('+')]), [['tee_uid_s', 2, 'front+back']]);
    assert.equal(qikink.orders.length, 0);

    assert.deepEqual(subjects().sort(), [`Order received: AST-${order.id}`, `Paid shop order AST-${order.id}`]);
    assert.match(mailTo('ada@example.com')[0].text, /\$83\.00/);
  });

  test('India: a paid order goes to Qikink, prepaid, with the courier’s details', async () => {
    boot();
    const order = await paidShopOrder(INDIA);
    assert.equal(order.status, 'fulfilled');
    assert.equal(order.fulfilment_provider, 'qikink');
    const [placed] = qikink.orders;
    assert.equal(order.qikink_order_id, String(placed.order_id));
    assert.equal(placed.host, 'sandbox.qikink.com', 'test keys only reach the Qikink sandbox');
    assert.match(order.notes, /Qikink sandbox/);

    const sent = placed.request;
    assert.deepEqual([sent.order_number, sent.gateway, sent.qikink_shipping, sent.total_order_value], [`AST-${order.id}`, 'Prepaid', '1', '7998']);
    assert.deepEqual(sent.line_items.map((l) => [l.sku, l.quantity, l.price, l.print_type_id, l.search_from_my_products]), [['USs-Bk-S', '2', '3999', '1', 0]]);
    assert.deepEqual(sent.line_items[0].designs.map((d) => d.placement_sku), ['fr', 'bk']);
    assert.deepEqual(
      [sent.shipping_address.phone, sent.shipping_address.province, sent.shipping_address.zip, sent.shipping_address.country_code],
      ['+919999999999', 'KA', '560001', 'IN'],
    );
    assert.equal(gelato.orders.size, 0);
    assert.match(mailTo('ravi@example.com')[0].text, /₹7,998\.00/);
  });

  test('test keys never place a real Qikink order', async () => {
    boot({ env: { ...SHOP_ENV, QIKINK_BASE_URL: '' } });
    const order = await paidShopOrder(INDIA);
    assert.equal(qikink.orders.length, 0);
    assert.equal(order.status, 'fulfilled');
    assert.equal(order.qikink_order_id, null);
    assert.match(order.notes, /not sent to Qikink/);
  });

  test('live keys place real orders with both printers', async () => {
    boot({ env: { ...SHOP_ENV, STRIPE_SECRET_KEY: 'sk_live_abc', QIKINK_BASE_URL: '' } });
    const us = await paidShopOrder();
    assert.equal(gelato.orders.get(us.gelato_order_id).orderType, 'order');
    assert.equal(us.notes, undefined);
    await paidShopOrder(INDIA);
    assert.equal(qikink.orders[0].host, 'api.qikink.com');
  });

  test('confirming twice, or with the webhook at the same moment, prints once', async () => {
    boot();
    const { body } = await openCheckout();
    const id = sessionOf(body.payment.url);
    stripe.pay(id);
    const [a, b] = await Promise.all([confirm(id), webhook('checkout.session.completed', { id })]);
    assert.equal(a.body.state, 'paid');
    assert.equal(b.body.state, 'paid');
    assert.equal((await confirm(id)).body.state, 'paid');
    assert.equal(gelato.orders.size, 1);
    assert.equal(mailTo('ada@example.com').length, 1);
  });

  test('coming back without paying, or while the payment clears, delivers nothing', async () => {
    boot();
    const { body } = await openCheckout();
    const id = sessionOf(body.payment.url);
    const unpaid = await confirm(id);
    assert.deepEqual([unpaid.body.state, unpaid.body.kind], ['unpaid', 'shop']);
    stripe.pay(id, { paymentStatus: 'unpaid' });
    assert.equal((await confirm(id)).body.state, 'pending', 'complete, but the money has not cleared yet');
    assert.equal(cms.rows('orders')[0].status, 'pending');
    assert.equal(gelato.orders.size, 0);
  });

  test('forged or mismatched payments deliver nothing', async () => {
    boot();
    const first = sessionOf((await openCheckout()).body.payment.url);
    const second = sessionOf((await openCheckout()).body.payment.url);
    const third = sessionOf((await openCheckout()).body.payment.url);

    assert.equal((await confirm('../orders')).status, 400, 'not a session id');
    assert.equal((await confirm('cs_test_unknown')).status, 404, 'no order for it');

    stripe.sessions.get(first).client_reference_id = 'AST-999';
    stripe.pay(first);
    assert.equal((await confirm(first)).status, 502, 'session of another order');
    stripe.pay(second, { amount: 100 });
    assert.equal((await confirm(second)).status, 502, 'amount differs');
    stripe.pay(third, { currency: 'inr' });
    assert.equal((await confirm(third)).status, 502, 'currency differs');

    assert.equal(gelato.orders.size, 0);
    assert.deepEqual(cms.rows('orders').map((o) => o.status), ['pending', 'pending', 'pending']);
  });

  test('if Gelato refuses a paid order, the team gets an ACTION NEEDED email', async () => {
    boot({ gelatoOptions: { createFails: true } });
    const order = await paidShopOrder();
    assert.equal(order.status, 'fulfilment_failed');
    assert.match(order.notes, /Invalid print file/);
    const team = mailTo('team@antisocialtalks.com')[0];
    assert.match(team.subject, /^ACTION NEEDED: paid order AST-\d+ was not sent to Gelato/);
    assert.match(team.text, /Place this order by hand in the Gelato dashboard/);
    assert.equal(mailTo('ada@example.com').length, 1, 'the customer still gets the receipt');
  });

  test('if Qikink refuses a paid order, the team places it by hand', async () => {
    boot({ qikinkOptions: { createFails: true } });
    const order = await paidShopOrder(INDIA);
    assert.equal(order.status, 'fulfilment_failed');
    assert.match(order.notes, /Invalid SKU/);
    const team = mailTo('team@antisocialtalks.com')[0];
    assert.match(team.subject, /^ACTION NEEDED: paid order AST-\d+ was not sent to Qikink/);
    assert.match(team.text, /Qikink dashboard/);
  });

  test('closed while payments are off', async () => {
    boot({ env: { ...SHOP_ENV, PAYMENT_GATEWAY: 'none' } });
    assert.equal((await confirm('cs_test_x')).status, 501);
  });
});

/* ───────────────────────────── Stripe webhook ───────────────────────────── */

describe('POST /api/webhooks/payment', () => {
  test('settles an order whose visitor closed the tab', async () => {
    boot();
    const { body } = await openCheckout();
    const id = sessionOf(body.payment.url);
    stripe.pay(id);
    const r = await webhook('checkout.session.completed', { id });
    assert.deepEqual(r.body, { ok: true, state: 'paid' });
    assert.equal(cms.rows('orders')[0].status, 'fulfilled');
  });

  test('a payment that clears later is settled when it does', async () => {
    boot();
    const { body } = await openCheckout();
    const id = sessionOf(body.payment.url);
    stripe.pay(id, { paymentStatus: 'unpaid' });
    assert.equal((await webhook('checkout.session.completed', { id })).body.state, 'pending');
    stripe.pay(id);
    assert.equal((await webhook('checkout.session.async_payment_succeeded', { id })).body.state, 'paid');
    assert.equal(gelato.orders.size, 1);
  });

  test('a late payment on an abandoned checkout is still honoured', async () => {
    boot();
    const { body } = await openCheckout();
    const id = sessionOf(body.payment.url);
    cms.rows('orders')[0].status = 'abandoned';
    stripe.pay(id);
    assert.equal((await webhook('checkout.session.completed', { id })).body.state, 'paid');
    assert.equal(cms.rows('orders')[0].status, 'fulfilled');
  });

  test('wrong or old signatures are refused; other events and other integrations are ignored', async () => {
    boot();
    assert.equal((await webhook('checkout.session.completed', { id: 'cs_test_1' }, { secret: 'whsec_wrong' })).status, 400);
    const old = Math.floor(Date.now() / 1000) - 600;
    assert.equal((await webhook('checkout.session.completed', { id: 'cs_test_1' }, { timestamp: old })).status, 400, 'replayed later');
    assert.deepEqual((await webhook('payment_intent.succeeded', { id: 'pi_1' })).body, { ok: true, ignored: true });
    const stranger = await webhook('checkout.session.completed', { id: 'cs_test_from_a_payment_link' });
    assert.deepEqual(stranger, { status: 200, body: { ok: true, ignored: true } }, 'no retries for payments the site never made');
  });
});

/* ───────────────────────────── order jobs (cron) ───────────────────────────── */

describe('POST /api/cron/orders', () => {
  test('refused without the right secret', async () => {
    boot();
    assert.equal((await cron('')).status, 401);
    assert.equal((await cron('wrong-secret-0123456789abcd')).status, 401);
    assert.equal((await cron(CRON_SECRET.slice(0, -1))).status, 401);
    boot({ env: { ...SHOP_ENV, CRON_SECRET: 'short' } });
    assert.equal((await cron('short')).status, 401, 'a weak secret is never accepted');
    assert.equal((await cron()).status, 401);
  });

  test('staging and the live site share the CMS, but each order job only touches its own orders', async () => {
    boot();
    const paid = await paidShopOrder();
    assert.equal(paid.livemode, false, 'an order paid with test keys is marked as a test order');

    const old = minutesAgo(26 * 60);
    const pending = (id, extra) => ({ id, kind: 'shop', status: 'pending', amount: 10, amount_minor: 1000, currency: 'USD', email: `o${id}@example.com`, date_created: old, ...extra });
    cms.rows('orders').push(pending(901, { livemode: true }), pending(902, { livemode: false }), pending(903, {}));

    await cron();
    assert.deepEqual([901, 902, 903].map((id) => row('orders', id).status), ['pending', 'abandoned', 'abandoned'], 'test keys: only test orders');

    setEnv({ ...SHOP_ENV, STRIPE_SECRET_KEY: 'sk_live_abc', CRON_SECRET });
    row('orders', 902).status = 'pending';
    await cron();
    assert.deepEqual([901, 902].map((id) => row('orders', id).status), ['abandoned', 'pending'], 'live keys: only live orders');
  });

  test('shipping (Gelato): one email with tracking, then delivered', async () => {
    boot();
    const order = await paidShopOrder();
    gelato.ship(order.gelato_order_id, { trackingCode: null, trackingUrl: null });
    await cron();
    assert.equal(order.status, 'shipped');
    assert.equal(order.shipped_notified, undefined, 'no email until there is tracking');

    gelato.ship(order.gelato_order_id);
    await cron();
    assert.equal(order.tracking_code, 'TRACK123');
    assert.equal(order.shipped_notified, true);
    const shipped = mail.sent.filter((m) => m.subject === `Your order has shipped: AST-${order.id}`);
    assert.equal(shipped.length, 1);
    assert.match(shipped[0].text, /Tracking number: TRACK123/);
    assert.match(shipped[0].text, /Track it here: https:\/\/track\.test\/TRACK123/);

    gelato.ship(order.gelato_order_id, { status: 'delivered' });
    const { body } = await cron();
    assert.equal(order.status, 'delivered');
    assert.equal(mail.sent.filter((m) => /has shipped/.test(m.subject)).length, 1, 'still one email');
    assert.equal(body.report.shipping.delivered, 1);
  });

  test('shipping (Qikink): the courier and tracking link are emailed once, then delivered', async () => {
    boot();
    const order = await paidShopOrder(INDIA);
    await cron();
    assert.equal(order.qikink_status, 'Live');
    assert.equal(order.status, 'fulfilled');

    qikink.ship(`AST-${order.id}`, { status: 'In-Transit', awb: 'QK123', courier: 'Delhivery' });
    await cron();
    assert.equal(order.status, 'shipped');
    assert.equal(order.tracking_url, 'https://courierupdates.com/?awb=QK123');
    const shipped = mail.sent.filter((m) => m.subject === `Your order has shipped: AST-${order.id}`);
    assert.equal(shipped.length, 1);
    assert.match(shipped[0].text, /Carrier: Delhivery/);

    qikink.ship(`AST-${order.id}`, { status: 'Delivered', awb: 'QK123' });
    await cron();
    assert.equal(order.status, 'delivered');
    assert.equal(mail.sent.filter((m) => /has shipped/.test(m.subject)).length, 1);
  });

  test('a printer stopping a paid order alerts the team', async () => {
    boot();
    const viaGelato = await paidShopOrder();
    gelato.orders.get(viaGelato.gelato_order_id).fulfillmentStatus = 'canceled';
    const viaQikink = await paidShopOrder(INDIA);
    qikink.ship(`AST-${viaQikink.id}`, { status: 'Cancelled', awb: null });
    await cron();
    assert.equal(viaGelato.status, 'fulfilment_failed');
    assert.equal(viaQikink.status, 'fulfilment_failed');
    assert.ok(subjects().includes(`ACTION NEEDED: Gelato canceled order AST-${viaGelato.id}`));
    assert.ok(subjects().includes(`ACTION NEEDED: Qikink Cancelled order AST-${viaQikink.id}`));
  });

  test('"Cancel and refund": stops the print, then refunds in full through Stripe', async () => {
    boot();
    const order = await paidShopOrder();
    order.status = 'cancel_requested';
    const { body } = await cron();
    assert.deepEqual(body.report.requests, { refunded: 1 });
    assert.equal(gelato.orders.get(order.gelato_order_id).fulfillmentStatus, 'canceled');
    assert.deepEqual(stripe.refunds.map((r) => [r.payment_intent, r.amount]), [[order.stripe_payment_intent, 8300]]);
    assert.equal(order.status, 'refunded');
    assert.equal(order.refund_id, 're_T1');
    assert.match(mail.sent.find((m) => m.subject === `Refund on its way: AST-${order.id}`).text, /cancelled and refunded/);
  });

  test('"Cancel and refund" when Gelato is already printing: no refund, team told', async () => {
    boot({ gelatoOptions: { cancelFails: true } });
    const order = await paidShopOrder();
    order.status = 'cancel_requested';
    await cron();
    assert.equal(order.status, 'cancel_failed');
    assert.equal(stripe.refunds.length, 0);
    assert.match(mail.sent.find((m) => m.subject === `Could not cancel AST-${order.id}`).text, /NOT been refunded/);
  });

  test('"Cancel and refund" on a Qikink order: cancelled by hand in Qikink, then "Refund only"', async () => {
    boot();
    const order = await paidShopOrder(INDIA);
    order.status = 'cancel_requested';
    await cron();
    assert.equal(order.status, 'cancel_failed');
    assert.match(order.notes, /Qikink dashboard/);
    assert.equal(stripe.refunds.length, 0);

    order.status = 'refund_requested';
    await cron();
    assert.equal(order.status, 'refunded');
    assert.deepEqual(stripe.refunds.map((r) => r.amount), [799800]);
  });

  test('"Refund only" keeps the print going', async () => {
    boot();
    const order = await paidShopOrder();
    order.status = 'refund_requested';
    await cron();
    assert.equal(order.status, 'refunded');
    assert.equal(gelato.orders.get(order.gelato_order_id).fulfillmentStatus, 'draft');
  });

  test('cancelling a booking frees the place and refunds it', async () => {
    boot();
    const order = await paidTicket(2);
    order.status = 'cancel_requested';
    await cron();
    assert.equal(order.status, 'refunded');
    assert.deepEqual(stripe.refunds.map((r) => r.amount), [99800]);
    const registration = row('event_registrations', order.registration);
    assert.equal(registration.status, 'cancelled');
    assert.equal(registration.payment_status, 'refunded');
  });

  test('cancelling a checkout that was never paid just closes it', async () => {
    boot();
    await openCheckout();
    const [order] = cms.rows('orders');
    order.status = 'cancel_requested';
    await cron();
    assert.equal(order.status, 'cancelled');
    assert.equal(stripe.log.filter((l) => l.path === '/refunds').length, 0);
  });

  test('a refund Stripe refuses is flagged for the team', async () => {
    boot();
    const order = await paidShopOrder();
    stripe.sessions.get(order.stripe_session_id).refunded = true;
    order.status = 'refund_requested';
    await cron();
    assert.equal(order.status, 'refund_failed');
    assert.match(order.notes, /already been refunded/);
    assert.ok(subjects().includes(`Refund failed for AST-${order.id}`));
  });

  test('unfinished checkouts: wait, recover a missed payment, or close them', async () => {
    boot();
    for (let i = 0; i < 4; i++) await openCheckout();
    const [fresh, missed, expired, stale] = cms.rows('orders');
    fresh.date_created = minutesAgo(5);
    missed.date_created = minutesAgo(20);
    expired.date_created = minutesAgo(70);
    stale.date_created = minutesAgo(25 * 60);
    stripe.pay(missed.stripe_session_id);
    stripe.expire(expired.stripe_session_id);

    const { body } = await cron();
    assert.deepEqual(body.report.checkouts, { waiting: 1, recovered: 1, abandoned: 2 });
    assert.deepEqual([fresh, missed, expired, stale].map((o) => o.status), ['pending', 'fulfilled', 'abandoned', 'abandoned']);
  });

  test('an abandoned paid booking releases its places', async () => {
    boot();
    await register({ event: 'paid-talk', ...PERSON, attendees: '9' });
    const [order] = cms.rows('orders');
    order.date_created = minutesAgo(40);
    stripe.expire(order.stripe_session_id);
    await cron();
    assert.equal(order.status, 'abandoned');
    assert.equal(row('event_registrations', order.registration).status, 'cancelled');
  });

  test('a checkout that never reached Stripe is closed after a day', async () => {
    boot();
    stripe.handle = async () => new Response('{}', { status: 500 });
    await openCheckout();
    const [order] = cms.rows('orders');
    assert.equal(order.stripe_session_id, undefined);
    order.date_created = minutesAgo(25 * 60);
    await cron();
    assert.equal(order.status, 'abandoned');
  });

  test('one broken order does not stop the others', async () => {
    boot();
    const good = await paidShopOrder();
    const broken = await paidShopOrder();
    broken.gelato_order_id = 'gel-missing';
    gelato.ship(good.gelato_order_id);
    const { body } = await cron();
    assert.equal(body.report.shipping.error, 1);
    assert.equal(good.status, 'shipped');
  });
});

/* ───────────────────────────── Gelato webhook ───────────────────────────── */

describe('POST /api/webhooks/gelato', () => {
  const hook = (body) => read(routes.gelatoHook.POST(postJson('/api/webhooks/gelato', body)));

  test('updates the order straight away, reading the status back from Gelato', async () => {
    boot();
    const order = await paidShopOrder();
    gelato.ship(order.gelato_order_id);
    const r = await hook({ event: 'order_status_updated', orderId: order.gelato_order_id, orderReferenceId: `AST-${order.id}`, fulfillmentStatus: 'delivered' });
    assert.deepEqual(r.body, { ok: true, result: 'shipped' }, 'Gelato’s API, not the request body, decides the status');
    assert.equal(order.status, 'shipped');
  });

  test('ignores other references, unknown orders and mismatched ids', async () => {
    boot();
    const order = await paidShopOrder();
    assert.deepEqual((await hook({ orderReferenceId: 'TEST-1' })).body, { ok: true, ignored: true });
    assert.deepEqual((await hook({ orderReferenceId: 'AST-999' })).body, { ok: true, ignored: true });
    assert.deepEqual((await hook({ orderReferenceId: `AST-${order.id}`, orderId: 'gel-other' })).body, { ok: true, ignored: true });
    assert.equal((await read(routes.gelatoHook.POST(new Request('http://site.test/x', { method: 'POST', body: 'not json' })))).status, 400);
  });
});

/* ───────────────────────────── email ───────────────────────────── */

describe('sendMail', () => {
  const MESSAGE = { to: 'ada@example.com', subject: 'Hello', text: 'Body', replyTo: 'team@example.com' };

  test('Microsoft 365: sends as the MAIL_FROM mailbox', async () => {
    boot();
    assert.equal(await sendMail(MESSAGE), true);
    assert.deepEqual(mail.sent[0], { via: 'graph', from: 'admin@antisocialtalks.com', to: 'ada@example.com', subject: 'Hello', text: 'Body', replyTo: 'team@example.com' });
  });

  test('Resend when Microsoft is not set up', async () => {
    boot({ env: { MAIL_FROM: 'AntiSocialTalks <admin@antisocialtalks.com>', RESEND_API_KEY: 're_test' } });
    assert.equal(await sendMail(MESSAGE), true);
    assert.equal(mail.sent[0].via, 'resend');
  });

  test('a designed version and attachments go through either provider', async () => {
    const designed = { ...MESSAGE, html: '<p>Body</p>', attachments: [{ name: 'a.ics', contentType: 'text/calendar', content: 'QkVHSU4=' }] };
    for (const env of [SHOP_ENV, { MAIL_FROM: 'AntiSocialTalks <admin@antisocialtalks.com>', RESEND_API_KEY: 're_test' }]) {
      boot({ env });
      assert.equal(await sendMail(designed), true);
      assert.equal(mail.sent[0].html, '<p>Body</p>');
      assert.deepEqual(mail.sent[0].attachments, designed.attachments);
      net.restore();
      logs.restore();
    }
  });

  test('no provider: skipped quietly, nothing sent', async () => {
    boot({ env: {} });
    assert.equal(await sendMail(MESSAGE), false);
    assert.equal(net.calls.length, 0);
  });

  test('a rejected send never throws', async () => {
    boot();
    const signIn = mail.handle;
    mail.handle = async (request) =>
      new URL(request.url).host === 'graph.microsoft.com'
        ? new Response('{"error":{"code":"ErrorAccessDenied"}}', { status: 403 })
        : signIn(request);
    assert.equal(await sendMail(MESSAGE), false);
    assert.ok(logs.lines.some((l) => /rejected "Hello" \(403\)/.test(l)));
  });
});
