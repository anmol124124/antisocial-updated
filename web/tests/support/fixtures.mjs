// Sample CMS content shared by the unit tests and the end-to-end run. A fresh
// copy every call, so a test can change rows freely.

import { readFileSync } from 'node:fs';

const PNG_1x1 = Uint8Array.from(
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
);

export const FILES = {
  mockup: '11111111-1111-4111-8111-111111111111',
  front: '22222222-2222-4222-8222-222222222222',
  back: '33333333-3333-4333-8333-333333333333',
  proposal: '44444444-4444-4444-8444-444444444444',
  svg: '55555555-5555-4555-8555-555555555555',
  photo: '66666666-6666-4666-8666-666666666666',
  tealMockup: '77777777-7777-4777-8777-777777777777',
  tealFront: '88888888-8888-4888-8888-888888888888',
  sandMockup: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  galleryPhoto: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const SITE = 'https://stage.antisocialtalks.com';

/**
 * The site-wide settings and page copy, taken from the real starting content
 * (cms/seed/content.json) so the tests check the wording the site ships with.
 * Seed pictures become the 1x1 test PNG; the teaser clip is left out.
 */
const SITE_SEED = JSON.parse(readFileSync(new URL('../../../cms/seed/content.json', import.meta.url), 'utf8'));
const withTestFiles = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) && 'file' in v ? (/\.(mp4|webm)$/.test(v.file) ? null : FILES.photo) : v]),
  );

export function seed({ future = '2099-01-01T00:00:00.000Z' } = {}) {
  return {
    __singletons: Object.fromEntries(Object.entries(SITE_SEED.singletons).map(([k, v]) => [k, withTestFiles(v)])),
    ...Object.fromEntries(Object.entries(SITE_SEED.collections).map(([k, rows]) => [k, rows.map((r, i) => ({ id: i + 1, ...withTestFiles(r) }))])),
    __files: [
      { id: FILES.mockup, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.front, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.back, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.photo, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.tealMockup, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.tealFront, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.sandMockup, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.galleryPhoto, type: 'image/png', bytes: PNG_1x1 },
      { id: FILES.proposal, type: 'application/pdf', bytes: Uint8Array.from(Buffer.from('%PDF-1.4 private')) },
      { id: FILES.svg, type: 'image/svg+xml', bytes: Uint8Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')) },
    ],
    hosts: [
      { id: 1, name: 'Rishika Sharma', designation: 'Host & Moderator | AntiSocialTalks', quote: 'Ask the next question.', photo: FILES.mockup, bio: 'Host.', instagram_url: null, status: 'published' },
    ],
    episodes: [
      // Taken down: kept in the CMS, hidden on the site.
      { id: 1, title: 'Episode 01: The AntiSocial Question', description: 'Episode 01 is on its way.', youtube_url: null, status: 'archived', publish_date: '2026-10-22T00:00:00.000Z', topics: 'Human, Society', host: 1 },
      // Released, with both links; the newer one leads the home page.
      { id: 2, title: 'Real Talk: First Test Episode | AntiSocialTalks', description: null, youtube_url: 'https://youtu.be/AbCdEfGh001', spotify_url: 'https://open.spotify.com/episode/TestSpotify001', status: 'published', publish_date: '2026-10-28T12:00:00.000Z', topics: 'Health', host: 1 },
      { id: 3, title: 'Second Test Episode | AntiSocialTalks Ep. 2', description: null, youtube_url: 'https://www.youtube.com/watch?v=AbCdEfGh002', spotify_url: 'https://open.spotify.com/episode/TestSpotify002', status: 'published', publish_date: '2026-11-04T12:00:00.000Z', topics: null, host: null },
      // Filmed, not out yet: no links.
      { id: 4, title: 'Coming Test Episode', description: 'Not out yet.', youtube_url: null, spotify_url: null, status: 'coming_soon', publish_date: future, topics: 'Society', host: null },
    ],
    guests: [
      { id: 1, name: 'Abdu Rozik', designation: 'Singer | Actor', photo: FILES.mockup, bio: 'Bio one.', teaser: 'You’ve seen the headlines.', instagram_url: 'https://www.instagram.com/abdu_rozik', paired_with_label: null, home_position: 1, host: null, episode: { id: 3, title: 'Second Test Episode | AntiSocialTalks Ep. 2', status: 'published' }, status: 'published' },
      // Still linked to the taken-down episode: the site shows no episode for her.
      { id: 2, name: 'Gauri G', designation: 'Dancer | Actor', photo: null, bio: 'Bio two.', teaser: 'She can play a role.', instagram_url: null, paired_with_label: null, home_position: 2, host: null, episode: { id: 1, title: 'Episode 01: The AntiSocial Question', status: 'archived' }, status: 'published' },
      { id: 3, name: 'Dr. Anmol Kapoor', designation: 'Founder & Chairman', photo: null, bio: 'Bio three.', teaser: 'If everyone agrees…', instagram_url: null, paired_with_label: null, home_position: 3, host: null, episode: null, status: 'published' },
      // Renamed from "Reem Elkott": the old address forwards here.
      { id: 5, name: 'Reem Elkot', previous_slugs: ['reem-elkott'], designation: 'Creator', photo: null, bio: 'Bio five.', teaser: null, instagram_url: null, paired_with_label: null, home_position: null, host: null, episode: null, status: 'published' },
      { id: 4, name: 'Hidden Guest', designation: 'Draft', photo: null, bio: null, teaser: null, instagram_url: null, paired_with_label: null, home_position: null, host: null, episode: null, status: 'draft' },
    ],
    topics: ['Human', 'Health', 'Science', 'Technology', 'Business', 'Society', 'The Future'].map((title, i) => ({
      id: i + 1,
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      blurb: `${title} blurb.`,
      image: null,
      sort: i + 1,
    })),
    chapters: [
      { id: 1, city: 'Dubai', slug: 'dubai', theme: 'The podcast, recorded in Dubai.', venue: null, event_date: null, status: 'coming_soon', registration_url: null, team: null, schedule: null, partners: null, past_talks: null, sort: 1 },
      { id: 2, city: 'India', slug: 'india', theme: 'The podcast, recorded across India.', venue: null, event_date: null, status: 'coming_soon', registration_url: null, team: null, schedule: null, partners: null, past_talks: null, sort: 3 },
      { id: 3, city: 'USA', slug: 'usa', theme: 'The podcast, recorded in the USA.', venue: null, event_date: null, status: 'coming_soon', registration_url: null, team: null, schedule: null, partners: null, past_talks: null, sort: 2 },
    ],
    events: [
      { id: 1, title: 'Dubai Event', slug: 'dubai-upcoming-chapter-event', visibility: 'published', status: 'registration_open', chapter: { id: 1, city: 'Dubai', slug: 'dubai' }, region: 'Dubai', city: 'Dubai', blurb: 'A live evening.', theme: null, description: 'About it.', audience: null, starts_at: null, timezone: 'Asia/Dubai', venue_name: null, venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: null, ticket_price: null, ticket_currency: null, capacity: 3, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 1 },
      { id: 2, title: 'Paid Talk', slug: 'paid-talk', visibility: 'published', status: 'registration_open', chapter: null, region: 'India', city: 'Mumbai', blurb: 'Paid.', theme: null, description: null, audience: null, starts_at: '2099-02-01T13:30:00.000Z', timezone: 'Asia/Kolkata', venue_name: 'Hall', venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: null, ticket_price: 499, ticket_currency: 'INR', capacity: 10, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 2 },
      { id: 3, title: 'Coming Soon Talk', slug: 'coming-soon-talk', visibility: 'published', status: 'coming_soon', chapter: null, region: 'USA', city: null, blurb: null, theme: null, description: null, audience: null, starts_at: null, timezone: null, venue_name: null, venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: null, ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 3 },
      { id: 5, title: 'Invitation Talk', slug: 'invitation-talk', visibility: 'published', status: 'rsvp_open', chapter: null, region: 'AntiSocialTalks Davos', city: 'Zurich', blurb: 'By invitation.', theme: null, description: 'An invitation-only session.', audience: null, starts_at: '2099-01-17T10:00:00.000Z', timezone: 'Europe/Zurich', venue_name: 'Shared on RSVP confirmation', venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: 'By invitation only.', ticket_price: null, ticket_currency: null, capacity: 2, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 5 },
      // A date without a start time yet, and a description in two paragraphs.
      { id: 6, title: 'Date Only Talk', slug: 'date-only-talk', visibility: 'published', status: 'coming_soon', chapter: null, region: 'UK', city: 'London', blurb: 'Time to follow.', theme: null, description: 'First paragraph.\n\nSecond paragraph.', audience: null, starts_at: '2099-11-03T00:00:00.000Z', time_tba: true, timezone: 'Europe/London', venue_name: null, venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: null, ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: FILES.photo, sort: 6 },
      // Invite only: no public form; credits, goodies, highlights, topics and a statement.
      { id: 7, title: 'Private Talk', slug: 'private-talk', visibility: 'published', status: 'invite_only', chapter: null, region: 'UK', city: 'London', blurb: 'A private afternoon.', theme: 'Big questions.', description: 'What happens next?\n\nAn afternoon of bold perspectives.', audience: null, starts_at: '2099-11-03T11:30:00.000Z', ends_at: '2099-11-03T15:00:00.000Z', timezone: 'Europe/London', venue_name: 'Shared with invited guests', venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: 'Your RSVP link is sent personally by email.', ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: 'team@antisocialtalks.com', recording_url: null, image: null, sort: 7,
        // Two point to profiles already on the site (a voice, a host by first name); the partner has its own title and link.
        people: [
          { role: 'Organiser', voice: 'dr-anmol-kapoor', name: 'Dr. A. Kapoor', bio: 'Brings the people together.' },
          { role: 'Host', host: 'Rishika' },
          { role: 'Co-organiser and partner', name: 'BioAro', title: 'The intelligence layer', url: 'https://www.bioaro.com', logo: FILES.galleryPhoto },
        ],
        perk: 'Goodies for every guest.', topics: 'Longevity\nGenomics', pull_quote: 'No small talk.\nOnly the real stuff.',
        highlights: [{ label: 'The format', title: 'Not a panel', text: 'Real conversation.' }],
        // The private invitation link (/invite/<code>); the venue and the note go only in the invitation email.
        invite_code: 'private-talk-invite-7k2m', invite_venue: 'The Secret Room, 1 Hidden Lane, London', invite_message: 'Arrive by 11:15 AM.\nBring photo ID.' },
      // Early bird: interest with its own note and button, on the dark card, with a secret guest.
      { id: 8, title: 'Early Bird Talk', slug: 'early-bird-talk', visibility: 'published', status: 'early_bird', chapter: null, region: 'Dubai', city: 'Dubai', blurb: 'A full night.', theme: null, description: null, audience: null, starts_at: '2099-11-11T08:00:00.000Z', time_tba: true, timezone: 'Asia/Dubai', venue_name: null, venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: null, ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 8,
        featured: true, includes: 'Early bird access\nGoodies', teaser: { label: 'The main character', title: 'Every night has one.', text: 'Revealed soon.' },
        kicker: 'AntiSocialTalks comes to', headline: 'Dubai', format: 'Live talk show', experience: 'Talk show · Music', country: 'UAE',
        in_the_room: 'Music\nFood\nBecome a member', closing: 'Challenge conventional\nthinking.', pull_quote: 'Not a networking event.\nNo speeches.\n\nA night of real talk.' },
      // Details still being shaped: no form, no programme, only the community.
      { id: 9, title: 'Soon Talk', slug: 'soon-talk', visibility: 'published', status: 'details_soon', chapter: null, region: 'AntiSocialTalks Davos', city: 'Davos', blurb: 'Before Davos.', theme: null, description: 'A daytime session.', audience: null, starts_at: '2099-01-17T10:00:00.000Z', timezone: 'Europe/Zurich', venue_name: 'Shared on RSVP confirmation', venue_address: null, map_url: null, speakers: null, moderator: null, schedule: 'Panel at noon', ticket_info: 'Reserve now.', ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 9, cta_label: 'Book This Seat' },
      // Over, though the CMS still says invite only (as London did): it reads as completed everywhere.
      { id: 10, title: 'Past Talk', slug: 'past-talk', visibility: 'published', status: 'invite_only', chapter: null, region: 'UK', city: 'Lisbon', blurb: 'An afternoon that happened.', theme: null, description: 'It was a good afternoon.', audience: null, starts_at: '2020-11-03T11:30:00.000Z', ends_at: '2020-11-03T15:00:00.000Z', timezone: 'Europe/London', venue_name: 'Shared with invited guests', venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: 'Your link to the past is in your inbox.', ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 10,
        perk: 'Old goodies for every guest.', includes: 'Yesterday’s access', teaser: { label: 'Old secret', title: 'A guest from the past.', text: 'Revealed long ago.' },
        invite_code: 'past-talk-invite-3n8q', invite_venue: 'The Old Room, 2 Past Lane', invite_message: null },
      { id: 4, title: 'India: Upcoming Chapter Event', slug: 'india-upcoming-chapter-event', visibility: 'draft', status: 'coming_soon', chapter: null, region: 'India', city: null, blurb: null, theme: null, description: null, audience: null, starts_at: null, timezone: null, venue_name: null, venue_address: null, map_url: null, speakers: null, moderator: null, schedule: null, ticket_info: null, ticket_price: null, ticket_currency: null, capacity: null, accessibility_info: null, terms: null, contact_email: null, recording_url: null, image: null, sort: 4 },
    ],
    event_registrations: [],
    applications: [],
    submissions: [],
    orders: [],
    shop_products: [
      {
        id: 1,
        title: 'Not Anti-Opinion Tee',
        slug: 'tee-anti-bullshit',
        description: 'Oversized tee.',
        gelato_product_uid: 'tee_uid_m',
        print_file_url: `${SITE}/api/assets/${FILES.front}`,
        print_files: { front: `${SITE}/api/assets/${FILES.front}`, back: `${SITE}/api/assets/${FILES.back}` },
        photo: FILES.photo,
        mockup: FILES.mockup,
        mockup_back: null,
        // One more photo of the first colour, after the main ones.
        gallery: [FILES.galleryPhoto],
        price: 3999,
        currency: 'INR',
        prices: { INR: 3999, USD: 39 },
        variants: [
          { uid: 'tee_uid_s', color: 'Deep Black', size: 'S' },
          { uid: 'tee_uid_m', color: 'Deep Black', size: 'M' },
          // Gelato makes teal; Qikink has no teal code, so not in India.
          { uid: 'tee_teal_m', color: 'Teal', size: 'M' },
          // Only Qikink makes sand: India only.
          { uid: 'in:tee-anti-bullshit:sand:s', color: 'Sand', size: 'S', markets: ['IN'] },
        ],
        colorways: {
          'Deep Black': { swatch: '#141414', note: 'Oversized fit' },
          Teal: { mockup: FILES.tealMockup, print_files: { front: `${SITE}/api/assets/${FILES.tealFront}`, back: `${SITE}/api/assets/${FILES.back}` }, swatch: '#106E80', note: 'Regular fit' },
          Sand: { mockup: FILES.sandMockup, swatch: '#D8C7A6', note: 'India only' },
        },
        // India: Qikink makes size S only, in black and sand.
        qikink: {
          sku_template: 'USs-{color}-{size}',
          color_codes: { 'Deep Black': 'Bk', Sand: 'Sd' },
          sizes: ['S'],
          print_type_id: 1,
          designs: { fr: { width: 11.25, height: 15 }, bk: { width: 11.25, height: 15 } },
        },
        // India's garment is Qikink's, so its fabric row differs.
        specs: {
          default: { Fit: 'Oversized', Fabric: 'Gelato cotton, 220 g/m²', Care: 'Wash cold' },
          IN: { Fabric: 'Qikink cotton, 240 g/m²' },
        },
        status: 'published',
        sort: 1,
      },
      {
        id: 2,
        title: 'India Only Tee',
        slug: 'india-only',
        description: 'Sold in India only.',
        gelato_product_uid: 'india_uid',
        print_file_url: `${SITE}/api/assets/${FILES.front}`,
        print_files: null,
        mockup: FILES.mockup,
        price: 999,
        currency: 'INR',
        prices: null,
        variants: null,
        qikink: { sku_template: 'USs-Wh-M', print_type_id: 1, designs: { fr: { width: 10, height: 12 } } },
        status: 'published',
        sort: 2,
      },
      {
        id: 3,
        title: 'Retired Tee',
        slug: 'retired',
        description: 'Draft.',
        gelato_product_uid: 'old_uid',
        print_file_url: null,
        print_files: null,
        mockup: null,
        price: 100,
        currency: 'INR',
        prices: null,
        variants: null,
        status: 'draft',
        sort: 3,
      },
    ],
  };
}

export const ADDRESS = {
  US: { firstName: 'Ada', lastName: 'Lovelace', addressLine1: '350 5th Ave', city: 'New York', state: 'NY', postCode: '10118', country: 'US', email: 'ada@example.com', phone: '+12125550100' },
  IN: { firstName: 'Ravi', lastName: 'Kumar', addressLine1: '1 MG Road', city: 'Bengaluru', state: 'KA', postCode: '560001', country: 'IN', email: 'ravi@example.com', phone: '+919999999999' },
  GB: { firstName: 'Sam', lastName: 'Smith', addressLine1: '10 Downing St', city: 'London', postCode: 'SW1A 2AA', country: 'GB', email: 'sam@example.com' },
  CA: { firstName: 'Maya', lastName: 'Singh', addressLine1: '100 King St W', city: 'Toronto', state: 'ON', postCode: 'M5V 2T6', country: 'CA', email: 'maya@example.com' },
};
