import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { setEnv } from '../support/mocks.mjs';

describe('markets', async () => {
  const { MARKETS, marketForCountry, priceIn, isMarket } = await import('@/lib/markets');

  test('India pays in rupees; the US, Canada, the UK and the UAE pay in US dollars', () => {
    assert.deepEqual(
      Object.values(MARKETS).map((m) => `${m.code}:${m.currency}`),
      ['IN:INR', 'US:USD', 'CA:USD', 'GB:USD', 'AE:USD'],
    );
  });

  test('visitor country maps to a market; everywhere else shops in USD', () => {
    assert.equal(marketForCountry('in'), 'IN');
    assert.equal(marketForCountry('AE'), 'AE');
    assert.equal(marketForCountry('ca'), 'CA');
    assert.equal(marketForCountry('DE'), 'US');
    assert.equal(marketForCountry(null), 'US');
    assert.equal(isMarket('GB'), true);
    assert.equal(isMarket('FR'), false);
  });

  test('per-market price wins; the legacy price only counts in its own currency', () => {
    const product = { price: 3999, currency: 'INR', prices: { INR: 3999, USD: 39 } };
    assert.equal(priceIn(product, 'USD'), 39);
    assert.equal(priceIn(product, 'GBP'), null);
    assert.equal(priceIn({ price: 999, currency: 'INR', prices: null }, 'INR'), 999);
    assert.equal(priceIn({ price: 999, currency: 'INR', prices: null }, 'USD'), null);
    assert.equal(priceIn({ price: 0, currency: 'INR' }, 'INR'), null, 'a zero price is not for sale');
    assert.equal(priceIn({ prices: { USD: '39.5' } }, 'USD'), 39.5, 'string amounts from the CMS are numbers');
  });
});

describe('chapter forms', async () => {
  const { validateFields, APPLICATIONS, COMMUNITY_OPTIONS, applicationHref, ticketPrice, formatEventDate, registrationFields, statusOf } =
    await import('@/lib/chapters');

  test('event times in the event’s own zone: a range, a date without a time, the large date', async () => {
    const { eventWhen } = await import('@/lib/chapters');
    const london = eventWhen({ starts_at: '2026-11-03T11:30:00.000Z', ends_at: '2026-11-03T15:00:00.000Z', timezone: 'Europe/London' });
    assert.equal(london.date, 'Tue, 3 Nov 2026');
    assert.equal(london.time, '11:30 AM – 3:00 PM GMT');
    assert.deepEqual([london.day, london.month, london.monthName, london.weekday, london.year], ['03', '11', 'Nov', 'Tue', '2026']);
    const dubai = eventWhen({ starts_at: '2026-11-11T08:00:00.000Z', time_tba: true, timezone: 'Asia/Dubai' });
    assert.equal(dubai.time, null, 'no made-up time while it is to be announced');
    assert.equal(dubai.date, 'Wed, 11 Nov 2026');
    assert.match(eventWhen({ starts_at: '2027-01-17T10:00:00.000Z', timezone: 'Europe/Zurich' }).time, /^11:00 AM GMT\+1$/);
    assert.equal(eventWhen({ starts_at: null, timezone: null }), null);
  });

  test('the people behind an event get their credit, nameless entries are dropped', async () => {
    const { eventPeople } = await import('@/lib/chapters');
    const people = eventPeople([
      { role: 'Organiser', name: 'Dr. Anmol Kapoor' },
      { role: 'Host', name: 'Jessica', bio: ' ' },
      { role: 'Co-organiser and partner', name: 'BioAro' },
      { role: 'Speaker', name: 'Ada', credit: 'In conversation' },
      { role: 'Host', name: '' },
    ]);
    assert.deepEqual(people.map((p) => p.credit), ['Organised by', 'Hosted by', 'Co-organised with', 'In conversation']);
    assert.equal(people[1].bio, null);
    assert.deepEqual(eventPeople(null), []);
  });

  test('an event’s people can point to a voice or a host already on the site', async () => {
    const { eventPeople } = await import('@/lib/chapters');
    const profiles = {
      voices: [{ name: 'Dr. Anmol Kapoor', designation: 'Founder & Chairman', photo: 'anmol.jpg', slug: 'dr-anmol-kapoor' }],
      hosts: [{ name: 'Jessica Hillier', designation: 'Host & Moderator | UAE Edition', photo: 'jess.jpg' }],
    };
    const [anmol, jessica, jess, bioaro, missing] = eventPeople(
      [
        { role: 'Organiser', voice: 'dr-anmol-kapoor', name: 'Anmol' },
        { role: 'Host', host: 'Jessica Hillier', title: 'Host & Moderator' },
        { role: 'Host', host: 'jessica' },
        { role: 'Partner', name: 'BioAro', title: 'Healthcare 3.0', url: 'https://www.bioaro.com' },
        { role: 'Speaker', voice: 'nobody', name: 'Someone' },
      ],
      profiles,
    );
    // The profile's name, title and photo, and a link to it.
    assert.deepEqual([anmol.name, anmol.title, anmol.photo, anmol.href], ['Dr. Anmol Kapoor', 'Founder & Chairman', 'anmol.jpg', '/voices/dr-anmol-kapoor']);
    // The event's own title wins; a host is found by first name too.
    assert.deepEqual([jessica.title, jessica.photo, jessica.href], ['Host & Moderator', 'jess.jpg', '/about#hosts']);
    assert.equal(jess.name, 'Jessica Hillier');
    assert.deepEqual([bioaro.title, bioaro.photo, bioaro.href, bioaro.logo], ['Healthcare 3.0', null, 'https://www.bioaro.com', null]);
    assert.equal(eventPeople([{ role: 'Partner', name: 'BioAro', logo: 'logo-id' }])[0].logo, 'logo-id');
    // A voice that isn't on the site: the event's own name, no photo, no link.
    assert.deepEqual([missing.name, missing.photo, missing.href], ['Someone', null, null]);
  });

  test('statements: lines, then a caption after a blank line; places: city and country', async () => {
    const { statement, eventPlace } = await import('@/lib/chapters');
    assert.deepEqual(statement('One.\nTwo.\n\nA small note.'), { lines: ['One.', 'Two.'], caption: 'A small note.' });
    assert.deepEqual(statement('One.'), { lines: ['One.'], caption: null });
    assert.equal(statement('  '), null);
    assert.equal(eventPlace({ city: 'Dubai', region: 'Dubai', country: 'UAE' }), 'Dubai, UAE');
    assert.equal(eventPlace({ city: 'Zurich', region: 'AntiSocialTalks Davos', country: null }), 'Zurich');
    assert.equal(eventPlace({ city: 'London', region: 'UK' }), 'London, UK');
  });

  test('invite only has no public form; early bird takes interest with its own button', () => {
    assert.equal(statusOf('invite_only').mode, 'private');
    assert.equal(statusOf('early_bird').mode, 'interest');
    assert.equal(statusOf('early_bird').cta, 'Reserve Your Spot');
  });

  test('every form has unique field names and a confirmation that names the next step', () => {
    for (const config of Object.values(APPLICATIONS)) {
      const names = config.fields.map((f) => f.name);
      assert.equal(new Set(names).size, names.length, `${config.type} repeats a field`);
      assert.match(config.confirmation, /next step|review/i, `${config.type} confirmation`);
    }
    const slugs = Object.values(APPLICATIONS).map((a) => a.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'slugs are unique');
  });

  test('each form lives at one address', () => {
    assert.equal(applicationHref('chapter_founder'), '/chapters/start');
    assert.equal(applicationHref('organiser'), '/chapters/organise');
    assert.equal(applicationHref('speaker'), '/chapters/apply/speak');
    assert.deepEqual(COMMUNITY_OPTIONS, ['speaker', 'local_team', 'chapter_partner']);
  });

  test('Start a Chapter asks where, why, who, what and how', () => {
    const names = APPLICATIONS.chapter_founder.fields.map((f) => f.name);
    for (const n of ['city', 'country', 'why_mission', 'team_type', 'chapter_plans', 'first_steps']) assert.ok(names.includes(n), n);
  });

  test('Nominate a Voice has the eight fields and requires consent', () => {
    const names = APPLICATIONS.speaker.fields.map((f) => f.name);
    for (const n of ['nominee_name', 'organisation', 'city', 'country', 'topic', 'why_it_matters', 'bio', 'links', 'spoken_before', 'full_name', 'email', 'phone']) {
      assert.ok(names.includes(n), n);
    }
    assert.ok(APPLICATIONS.speaker.reviewNote, 'consent checkbox');
  });

  test('each kind of registration asks for its own fields', () => {
    const names = (mode) => registrationFields(mode).map((f) => f.name);
    assert.ok(names('booking').includes('attendees'));
    assert.ok(!names('booking').includes('organisation'));
    assert.ok(names('rsvp').includes('organisation') && names('rsvp').includes('job_title'), 'RSVP asks who you are');
    assert.ok(!names('rsvp').includes('attendees'), 'an invitation is for one person');
    assert.ok(!names('interest').includes('attendees') && !names('interest').includes('organisation'));
    assert.equal(statusOf('rsvp_open').mode, 'rsvp');
    assert.equal(statusOf('something_new').mode, 'interest', 'an unknown status is treated as Coming Soon');
  });

  test('validation: required, email, phone, select, number and length', () => {
    const fields = registrationFields('booking');
    const good = { full_name: ' Ada ', email: 'ada@example.com', phone: '+971 50 123 4567', city: 'Dubai', country: 'UAE', attendees: '2' };
    const ok = validateFields(fields, good);
    assert.equal(ok.ok, true);
    assert.equal(ok.values.full_name, 'Ada', 'trimmed');
    assert.equal(ok.values.attendees, 2, 'numbers are numbers');
    assert.equal(ok.values.accessibility_needs, null, 'optional blank is null');

    const fail = (patch) => validateFields(fields, { ...good, ...patch });
    assert.match(fail({ full_name: '' }).error, /Full name/);
    assert.match(fail({ email: 'nope' }).error, /valid email/);
    assert.match(fail({ phone: 'call me' }).error, /country code/);
    assert.match(fail({ attendees: '0' }).error, /between 1 and 20/);
    assert.match(fail({ attendees: '2.5' }).error, /between 1 and 20/);
    assert.match(fail({ full_name: 'x'.repeat(201) }).error, /too long/);
    assert.match(validateFields(APPLICATIONS.chapter_founder.fields, { team_type: 'maybe' }).error, /Full name/);
  });

  test('ticket prices: empty or zero is free', () => {
    assert.equal(ticketPrice({ ticket_price: null, ticket_currency: null }), null);
    assert.equal(ticketPrice({ ticket_price: 0, ticket_currency: 'INR' }), null);
    assert.deepEqual(ticketPrice({ ticket_price: '499', ticket_currency: 'inr' }), { amount: 499, currency: 'INR' });
    assert.deepEqual(ticketPrice({ ticket_price: 20, ticket_currency: null }), { amount: 20, currency: 'INR' });
  });

  test('event times are shown in the event’s own timezone', () => {
    const when = formatEventDate('2099-02-01T13:30:00.000Z', 'Asia/Kolkata');
    assert.match(when.date, /1 Feb 2099/);
    assert.match(when.time, /7:00\s?PM/);
    assert.equal(formatEventDate(null, 'Asia/Dubai'), null);
    assert.equal(formatEventDate('not a date', null), null);
  });
});

describe('stripe helpers', async () => {
  const st = await import('@/lib/stripe');
  beforeEach(() => setEnv({ STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_WEBHOOK_SECRET: 'whsec_test' }));
  const header = (body, { secret = 'whsec_test', t = Math.floor(Date.now() / 1000) } = {}) =>
    `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

  test('amounts go to the smallest currency unit', () => {
    assert.equal(st.toMinor(39, 'USD'), 3900);
    assert.equal(st.toMinor(3999.99, 'INR'), 399999);
    assert.equal(st.toMinor(0.1 + 0.2, 'AED'), 30, 'no floating point drift');
    assert.equal(st.toMinor(1.234, 'KWD'), 1234);
    assert.equal(st.toMinor(500, 'JPY'), 500);
  });

  test('test keys are test mode', () => {
    assert.equal(st.stripeTestMode(), true);
    setEnv({ STRIPE_SECRET_KEY: 'sk_live_abc' });
    assert.equal(st.stripeTestMode(), false);
  });

  test('webhook signature: HMAC of "timestamp.body", recent only', () => {
    const body = '{"type":"checkout.session.completed"}';
    assert.equal(st.webhookSignatureIsValid(body, header(body)), true);
    assert.equal(st.webhookSignatureIsValid(body, `v1=bad,${header(body)}`), true, 'any one valid v1 is enough (secret rotation)');
    assert.equal(st.webhookSignatureIsValid(`${body} `, header(body)), false, 'a changed body');
    assert.equal(st.webhookSignatureIsValid(body, header(body, { secret: 'whsec_other' })), false);
    assert.equal(st.webhookSignatureIsValid(body, header(body, { t: Math.floor(Date.now() / 1000) - 400 })), false, 'too old to trust');
    assert.equal(st.webhookSignatureIsValid(body, null), false);
    assert.equal(st.webhookSignatureIsValid(body, 't=1'), false);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(st.webhookSignatureIsValid(body, header(body)), false, 'no secret, nothing is trusted');
  });

  test('the payment behind a session, expanded or not', () => {
    assert.equal(st.paymentIntentOf({ payment_intent: 'pi_1' }), 'pi_1');
    assert.equal(st.paymentIntentOf({ payment_intent: { id: 'pi_2' } }), 'pi_2');
    assert.equal(st.paymentIntentOf({ payment_intent: null }), null);
  });
});

describe('qikink helpers', async () => {
  const { qikinkStage } = await import('@/lib/qikink');

  test('Qikink statuses in the order job’s terms', () => {
    assert.equal(qikinkStage({ status: 'Live' }).stage, 'open');
    assert.equal(qikinkStage({ status: 'Manifested', shipping: { awb: 'A1' } }).stage, 'shipped');
    assert.equal(qikinkStage({ status: 'Delivered', shipping: { awb: 'A1' } }).stage, 'delivered');
    for (const s of ['Cancelled', 'Lost', 'RTO Initiated', 'Out Of Stock']) assert.equal(qikinkStage({ status: s }).stage, 'failed', s);
    assert.deepEqual(qikinkStage({ status: 'In-Transit', shipping: { awb: 'A 1', courier_provider_name: 'Delhivery' } }).tracking, {
      code: 'A 1',
      url: 'https://courierupdates.com/?awb=A%201',
      carrier: 'Delhivery',
    });
  });
});

describe('gelato helpers', async () => {
  const { shippingOptions, trackingOf } = await import('@/lib/gelato');

  test('one delivery list for a cart split over two print facilities', () => {
    const options = shippingOptions({
      quotes: [
        { id: 'a', itemReferenceIds: ['1'], shipmentMethods: [
          { name: 'Standard', shipmentMethodUid: 'std', price: 5, currency: 'USD', minDeliveryDays: 3, maxDeliveryDays: 5 },
          { name: 'Express', shipmentMethodUid: 'exp', price: 12, currency: 'USD', minDeliveryDays: 1, maxDeliveryDays: 2 },
        ] },
        { id: 'b', itemReferenceIds: ['2'], shipmentMethods: [
          { name: 'Standard', shipmentMethodUid: 'std', price: 4.5, currency: 'USD', minDeliveryDays: 4, maxDeliveryDays: 9 },
        ] },
      ],
    });
    assert.deepEqual(options.map((o) => [o.shipmentMethodUid, o.price, o.maxDeliveryDays]), [
      ['std', 9.5, 9],
      ['exp', 16.5, 9],
    ], 'missing methods fall back to that parcel’s cheapest');
    assert.deepEqual(shippingOptions({ quotes: [] }), []);
  });

  test('tracking comes from the first parcel that has it', () => {
    assert.deepEqual(trackingOf({ shipment: { shipmentMethodName: 'DHL', packages: [{}, { trackingCode: 'X1', trackingUrl: 'https://t/X1' }] } }), {
      code: 'X1', url: 'https://t/X1', carrier: 'DHL',
    });
    assert.deepEqual(trackingOf({ shipment: null }), { code: null, url: null, carrier: null });
  });
});

describe('cart limits', async () => {
  const { clampQuantity, MAX_QUANTITY } = await import('@/lib/cart-limits');

  test('the cart and the checkout agree: whole numbers from 1 to 25', () => {
    assert.equal(MAX_QUANTITY, 25);
    for (const [input, expected] of [[3, 3], ['4', 4], [2.7, 2], [0, 1], [-5, 1], [Number.NaN, 1], [null, 1], ['abc', 1], [1000, 25]]) {
      assert.equal(clampQuantity(input), expected, String(input));
    }
  });
});

describe('delivery address', async () => {
  const { cleanAddress } = await import('@/lib/cart-pricing');
  const good = { firstName: ' Ada ', lastName: 'L', addressLine1: '1 St', city: 'NYC', state: 'NY', postCode: '10001', country: 'us', email: 'a@b.co', evil: 'x' };

  test('trims, upper-cases the country and drops unknown keys', () => {
    const r = cleanAddress(good);
    assert.equal(r.ok, true);
    assert.equal(r.value.market, 'US');
    assert.equal(r.value.address.firstName, 'Ada');
    assert.equal('evil' in r.value.address, false);
  });

  test('rejects missing fields, bad email, other countries and US without a state', () => {
    assert.match(cleanAddress({ ...good, city: '' }).error, /full address/);
    assert.match(cleanAddress({ ...good, email: 'nope' }).error, /valid email/);
    assert.match(cleanAddress({ ...good, country: 'FR' }).error, /India, the United States/);
    assert.match(cleanAddress({ ...good, state: '' }).error, /state/);
    assert.equal(cleanAddress({ ...good, country: 'GB', state: '' }).ok, true, 'state optional outside the US');
    assert.equal(cleanAddress(null).ok, false);
  });
});

describe('content helpers', async () => {
  const { slugify, youtubeId, printFilesOf } = await import('@/lib/content');
  const { assetUrl } = await import('@/lib/directus');
  const { formatMoney } = await import('@/lib/money');

  test('slugs: lower case, accents dropped, punctuation to dashes', () => {
    assert.equal(slugify('Dr. Anmol Kapoor'), 'dr-anmol-kapoor');
    assert.equal(slugify('Café Society'), 'cafe-society');
    assert.equal(slugify('  Episode 01: The AntiSocial Question! '), 'episode-01-the-antisocial-question');
  });

  test('YouTube ids from every URL shape people paste', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?t=5',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
    ]) assert.equal(youtubeId(url), 'dQw4w9WgXcQ', url);
    assert.equal(youtubeId('https://www.youtube.com/@AntiSocialTalks'), null);
    assert.equal(youtubeId(null), null);
  });

  test('print files: one per placement, else the single legacy file', () => {
    assert.deepEqual(printFilesOf({ print_files: { front: 'https://x/f.png', back: '', sleeve: null }, print_file_url: 'https://x/old.png' }), [
      { type: 'front', url: 'https://x/f.png' },
    ]);
    assert.deepEqual(printFilesOf({ print_files: null, print_file_url: 'https://x/old.png' }), [{ type: 'default', url: 'https://x/old.png' }]);
    assert.deepEqual(printFilesOf({ print_files: null, print_file_url: null }), []);
  });

  test('images go through the site’s own proxy, never the CMS host', () => {
    setEnv({ DIRECTUS_URL: 'https://cms.antisocialtalks.com' });
    assert.equal(assetUrl('abc', { width: 400 }), '/api/assets/abc?width=400&quality=82&fit=cover&format=webp');
    assert.equal(assetUrl(null), null);
  });

  test('money as visitors see it', () => {
    assert.equal(formatMoney(3999, 'INR'), '₹3,999.00');
    assert.equal(formatMoney(39, 'USD'), '$39.00');
    assert.equal(formatMoney(35, 'GBP'), '£35.00');
    assert.match(formatMoney(179, 'AED'), /^AED\s179\.00$/);
    assert.equal(formatMoney(5, 'NOPE'), 'NOPE 5.00');
  });
});

describe('colours', async () => {
  const { printFilesFor, imagesFor } = await import('@/lib/content');
  const { qikinkItemFor, marketsFor } = await import('@/lib/cart-pricing');
  const product = {
    title: 'Tee',
    photo: 'photo-black',
    mockup: 'mockup-black',
    mockup_back: null,
    print_files: { front: 'https://x/white.png' },
    print_file_url: null,
    variants: [
      { uid: 'g-black-m', color: 'Black', size: 'M' },
      { uid: 'g-grey-m', color: 'Grey', size: 'M' },
      { uid: 'in:tee:teal:m', color: 'Teal', size: 'M', markets: ['IN'] },
    ],
    colorways: { Grey: { mockup: 'mockup-grey', print_files: { front: 'https://x/dark.png' } }, Teal: {} },
    qikink: { sku_template: 'USs-{color}-{size}', color_codes: { Black: 'Bk', Teal: 'Tl' }, designs: { fr: { width: 11, height: 14 } } },
  };
  const variant = (uid) => product.variants.find((v) => v.uid === uid);

  test('each colour prints its own files, or the product’s', () => {
    assert.deepEqual(printFilesFor(product, 'Grey'), [{ type: 'front', url: 'https://x/dark.png' }]);
    assert.deepEqual(printFilesFor(product, 'Teal'), [{ type: 'front', url: 'https://x/white.png' }]);
    assert.deepEqual(printFilesFor(product, 'Black'), [{ type: 'front', url: 'https://x/white.png' }]);
  });

  test('a colour with its own pictures never shows the first colour’s photo', () => {
    assert.deepEqual(imagesFor(product, 'Grey'), { photo: null, mockup: 'mockup-grey', back: null, gallery: [], own: true });
    assert.equal(imagesFor(product, 'Black').photo, 'photo-black');
    // Each colour keeps its own further photos; the first colour's are the product's.
    const withGalleries = { ...product, gallery: ['black-2'], colorways: { ...product.colorways, Navy: { photo: 'navy-1', gallery: ['navy-2', 'navy-3'] } } };
    assert.deepEqual(imagesFor(withGalleries, 'Black').gallery, ['black-2']);
    assert.deepEqual(imagesFor(withGalleries, 'Navy').gallery, ['navy-2', 'navy-3']);
    assert.deepEqual(imagesFor(withGalleries, 'Grey').gallery, [], 'a colour with its own pictures never shows the first colour’s photos');
  });

  test('where each colour can be sold', () => {
    assert.deepEqual(marketsFor(product, variant('g-black-m')), ['IN', 'US', 'CA', 'GB', 'AE']);
    assert.deepEqual(marketsFor(product, variant('g-grey-m')), ['US', 'CA', 'GB', 'AE'], 'no Qikink code for grey');
    assert.deepEqual(marketsFor(product, variant('in:tee:teal:m')), ['IN'], 'Qikink only');
    assert.equal(qikinkItemFor(product, variant('in:tee:teal:m')).sku, 'USs-Tl-M');
  });

  test('without colour codes, Qikink makes only the first colour (a black SKU never prints teal)', () => {
    const legacy = { ...product, qikink: { sku_template: 'USs-Bk-{size}', designs: { fr: { width: 11, height: 14 } } } };
    assert.equal(qikinkItemFor(legacy, variant('g-black-m')).sku, 'USs-Bk-M');
    assert.equal(qikinkItemFor(legacy, variant('g-grey-m')), null);
  });

  test('a colour on another Qikink garment uses its own SKU; sizes take Qikink’s spelling', () => {
    const mixed = {
      ...product,
      variants: [...product.variants, { uid: 'g-grey-2xl', color: 'Grey', size: '2XL' }],
      qikink: {
        sku_template: 'UOsMRnHs-{color}-{size}',
        sku_templates: { Grey: 'MRnHs-{color}-{size}' },
        color_codes: { Black: 'Bk', Grey: 'Gm' },
        size_codes: { '2XL': 'XXL' },
        designs: { fr: { width: 11, height: 14 } },
      },
    };
    const of = (uid) => qikinkItemFor(mixed, mixed.variants.find((v) => v.uid === uid))?.sku;
    assert.equal(of('g-black-m'), 'UOsMRnHs-Bk-M');
    assert.equal(of('g-grey-m'), 'MRnHs-Gm-M');
    assert.equal(of('g-grey-2xl'), 'MRnHs-Gm-XXL');
    assert.equal(of('in:tee:teal:m'), undefined, 'no Qikink code for teal');
  });

  test('the specification: the colour’s rows over the product’s, a market’s over the default, in the product’s order', async () => {
    const { specsFor } = await import('@/lib/content');
    const specced = {
      specs: { default: { Fit: 'Oversized', Fabric: 'Gelato 220', Care: 'Wash cold' }, IN: { Fabric: 'Qikink 240' } },
      colorways: { Grey: { specs: { default: { Fit: 'Regular', Fabric: 'Gelato 142' }, IN: { Fabric: 'Qikink 180' } } }, Teal: {} },
    };
    assert.deepEqual(specsFor(specced, 'Black', 'US'), [['Fit', 'Oversized'], ['Fabric', 'Gelato 220'], ['Care', 'Wash cold']]);
    assert.deepEqual(specsFor(specced, 'Black', 'IN'), [['Fit', 'Oversized'], ['Fabric', 'Qikink 240'], ['Care', 'Wash cold']]);
    assert.deepEqual(specsFor(specced, 'Grey', 'US'), [['Fit', 'Regular'], ['Fabric', 'Gelato 142'], ['Care', 'Wash cold']]);
    assert.deepEqual(specsFor(specced, 'Grey', 'IN'), [['Fit', 'Regular'], ['Fabric', 'Qikink 180'], ['Care', 'Wash cold']]);
    assert.deepEqual(specsFor(specced, 'Teal', 'IN')[1], ['Fabric', 'Qikink 240'], 'a colour without its own rows uses the product’s');
    assert.deepEqual(specsFor({ specs: null, colorways: null }, null, 'US'), [], 'no specification, no table');
  });
});

describe('search engines', async () => {
  const { metaDescription } = await import('@/lib/meta');
  const robots = (await import('@/app/robots')).default;

  test('meta descriptions: short text as is, long text cut at a word', () => {
    assert.equal(metaDescription('  A live   evening. '), 'A live evening.');
    assert.equal(metaDescription(null), undefined);
    assert.equal(metaDescription('   ', 'Paid Talk. Details and registration.'), 'Paid Talk. Details and registration.', 'empty CMS text uses the fallback');
    const bio = 'Abdu Rozik is a Tajik singer, blogger and actor who became one of the most recognisable faces on social media, and then on television, by refusing to be defined by anyone else.';
    const d = metaDescription(bio);
    assert.ok(d.length <= 155, `${d.length} characters`);
    assert.ok(d.endsWith('…'));
    assert.ok(bio.startsWith(d.slice(0, -1)), 'cut, not rewritten');
    assert.match(d, /\w…$/, 'no trailing space or comma before the ellipsis');
    assert.equal(metaDescription('x'.repeat(300)).length, 155, 'one long word is cut hard');
  });

  test('robots.txt: only the copy with SITE_INDEXABLE=true may be indexed', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://stage.antisocialtalks.com' });
    assert.deepEqual(robots(), { rules: [{ userAgent: '*', disallow: '/' }] });
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://antisocialtalks.com' });
    assert.deepEqual(robots(), { rules: [{ userAgent: '*', disallow: '/' }] }, 'the live address alone is not enough');
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://antisocialtalks.com', SITE_INDEXABLE: 'true' });
    const live = robots();
    assert.equal(live.sitemap, 'https://antisocialtalks.com/sitemap.xml');
    assert.deepEqual(live.rules[0].disallow, ['/api/', '/cart', '/checkout', '/payment', '/invite/']);
  });
});

describe('past events', async () => {
  const { settleStatus } = await import('@/lib/content');
  const now = Date.parse('2026-11-10T12:00:00Z');
  const london = { status: 'invite_only', starts_at: '2026-11-03T11:30:00.000Z', ends_at: '2026-11-03T15:00:00.000Z' };

  test('an event is completed once it has ended, whatever the CMS still says', () => {
    assert.equal(settleStatus(london, now).status, 'completed');
    assert.equal(settleStatus(london, Date.parse('2026-11-03T14:59:00Z')).status, 'invite_only', 'still on');
    assert.equal(london.status, 'invite_only', 'the row itself is not changed');
  });

  test('without an end time it is over a day after it starts; without a date, never', () => {
    const dubai = { status: 'early_bird', starts_at: '2026-11-11T08:00:00.000Z', ends_at: null };
    assert.equal(settleStatus(dubai, Date.parse('2026-11-12T07:59:00Z')).status, 'early_bird');
    assert.equal(settleStatus(dubai, Date.parse('2026-11-12T08:01:00Z')).status, 'completed');
    assert.equal(settleStatus({ status: 'coming_soon', starts_at: null, ends_at: null }, now).status, 'coming_soon');
  });

  test('postponed and cancelled keep their own notices', () => {
    for (const status of ['postponed', 'cancelled']) assert.equal(settleStatus({ ...london, status }, now).status, status);
  });
});

describe('legal text', async () => {
  const { TERMS, PRIVACY } = await import('@/lib/legal');

  test('the Terms follow the final document: 23 clauses, the Chapter Partner Program is clause 11', () => {
    const all = JSON.stringify(TERMS);
    assert.equal(/Mobile Applications|App Store/.test(all), false);
    assert.equal(TERMS.sections.length, 23);
    // The text cites "Clause 11" by number, and the page numbers clauses in this order.
    assert.equal(TERMS.sections[10].heading, 'Chapter Partner Program');
    assert.match(all, /except as provided in Clause 11\./);
    assert.match(all, /at least sixteen \(16\) years of age/);
    assert.equal(TERMS.sections.at(-1).heading, 'Grievances and Contact');
  });

  test('the Privacy Policy is the full final document, with the Privacy Officer', () => {
    const all = JSON.stringify(PRIVACY);
    assert.equal(PRIVACY.sections.length, 16);
    assert.equal(PRIVACY.sections.at(-1).heading, 'Privacy Officer and Contact');
    assert.match(all, /Personal Information Protection Act \(Alberta\)/);
    assert.match(all, /Viswateja, Privacy Officer/);
    assert.match(all, /legal@antisocialtalks\.com/);
  });

  test('chapter and organiser applications link to the Chapter Partner Program clause', async () => {
    const { LEGAL } = await import('@/lib/chapters');
    const anchor = LEGAL.chapterTerms.split('#')[1];
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    assert.ok(TERMS.sections.some((s) => slug(s.heading) === anchor), `no clause with the anchor #${anchor}`);
  });
});
