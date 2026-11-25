import 'server-only';
import { readItems, assetUrl } from './directus';
import type { Profile } from './chapters';

/* ────────────────────────────── types ────────────────────────────── */

export type Host = {
  id: number;
  name: string;
  /** e.g. "Host & Moderator | AntiSocialTalks". Added 2026-10 — see scripts/migrations/content-update-2026-10-04.mjs. */
  designation?: string | null;
  /** A one-line signature quote shown under the host. Added 2026-10. */
  quote?: string | null;
  photo: string | null;
  bio: string | null;
  instagram_url: string | null;
  status: string;
};

export type Episode = {
  id: number;
  title: string;
  description: string | null;
  youtube_url: string | null;
  /** The episode on Spotify, for the "Listen on Spotify" button. */
  spotify_url?: string | null;
  status: 'coming_soon' | 'published' | string;
  publish_date: string | null;
  topics: string | null;
  host: Host | number | null;
};

export type Guest = {
  id: number;
  name: string;
  designation: string | null;
  photo: string | null;
  bio: string | null;
  instagram_url: string | null;
  paired_with_label: string | null;
  /**
   * Position on the home page's "Meet the Voices" section (1 = first).
   * Empty = not on the home page; the guest still appears on /voices.
   */
  home_position?: number | null;
  /**
   * One-line hook shown on the guest's card and page, e.g. "On fame, fear,
   * and the thing nobody asks him about." Added 2026-10.
   */
  teaser?: string | null;
  host: Host | number | null;
  episode: Episode | number | null;
  status: string;
};

export type Chapter = {
  id: number;
  city: string;
  slug: string | null;
  theme: string | null;
  venue: string | null;
  event_date: string | null;
  status: 'coming_soon' | 'announced' | 'published' | string;
  registration_url: string | null;
  team: string | null;
  schedule: string | null;
  partners: string | null;
  past_talks: string | null;
  sort?: number | null;
};

/**
 * One event inside a chapter (added 2026-10 — see scripts/migrations/chapters-schema-2026-10-10.mjs).
 * Chapters are the local communities; events are what they put on. Only rows
 * with visibility "published" are ever read by the site, so the team can draft
 * an event, its speakers and schedule privately until it's confirmed.
 */
export type ChapterEvent = {
  id: number;
  title: string;
  slug: string | null;
  /** Short line shown on the card, e.g. "New voices. Fresh perspectives." */
  blurb: string | null;
  status: EventStatus;
  chapter: Pick<Chapter, 'id' | 'city' | 'slug'> | number | null;
  /** Shown as the card heading's region, e.g. "India" or "Dubai". */
  region: string | null;
  /** The event's own city — may be unknown even when the region is ("India"). */
  city: string | null;
  theme: string | null;
  description: string | null;
  audience: string | null;
  starts_at: string | null;
  /** The date is set but not the start time yet: the page says "Time to be announced". */
  time_tba?: boolean | null;
  /** When it finishes, for "11:30 AM – 3:00 PM". */
  ends_at?: string | null;
  /** Who is behind it: organiser, host, partner. Shown as credits on the card and as cards on the page. */
  people?: EventPerson[] | null;
  /** One line about what guests take home, e.g. "BioAro products for every guest". */
  perk?: string | null;
  /** "What you get", one per line. */
  includes?: string | null;
  /** A guest kept secret for now: { "label": "The main character", "text": "Revealed soon." } */
  teaser?: { label?: string | null; title?: string | null; text?: string | null } | null;
  /** Short cards on the event page: [{ "label": "The format", "title": "…", "text": "…" }] */
  highlights?: { label?: string | null; title: string; text?: string | null }[] | null;
  /** Subjects, one per line, shown as tags. */
  topics?: string | null;
  /**
   * The statement set large on the event page, one sentence per line; the last
   * line is the accent. After a blank line, a short caption in small type.
   */
  pull_quote?: string | null;
  /** Set apart on /events with the dark card. */
  featured?: boolean | null;
  /** The short line above the title, e.g. "AntiSocialTalks comes to". */
  kicker?: string | null;
  /** The large word at the top of the event page instead of the title, e.g. "Dubai". */
  headline?: string | null;
  /** Shown as a tag and in the details, e.g. "Kapoor Wealth Partners × AntiSocialTalks". */
  presented_by?: string | null;
  /** The kind of event, shown as a tag, e.g. "Live talk show". */
  format?: string | null;
  /** What the evening includes, e.g. "Talk show · Music · Food". */
  experience?: string | null;
  /** Shown after the city, e.g. "UAE". */
  country?: string | null;
  /** "What's in the room", one per line; the last line is set apart. */
  in_the_room?: string | null;
  /** The closing line of the event page, one line each; the last line is the accent. */
  closing?: string | null;
  /** The register button and heading, e.g. "Reserve Your Spot". */
  cta_label?: string | null;
  /**
   * The private invitation link: /invite/<invite_code>. Anyone with the link
   * can accept and is emailed their invitation straight away. Never shown on
   * the site.
   */
  invite_code?: string | null;
  /** The venue as the invitation email gives it (name and address). Never shown on the site. */
  invite_venue?: string | null;
  /** A note in the invitation email: arrival, dress code, what to bring. Never shown on the site. */
  invite_message?: string | null;
  /** IANA zone, e.g. "Asia/Dubai" — times are shown in the event's local time. */
  timezone: string | null;
  venue_name: string | null;
  venue_address: string | null;
  map_url: string | null;
  speakers: string | null;
  moderator: string | null;
  schedule: string | null;
  ticket_info: string | null;
  /** Price per person. Empty or 0 = free; otherwise booking goes through Stripe. */
  ticket_price: number | string | null;
  /** ISO code, e.g. INR or AED. */
  ticket_currency: string | null;
  /** Total places. Empty = no limit. */
  capacity: number | null;
  accessibility_info: string | null;
  terms: string | null;
  contact_email: string | null;
  recording_url: string | null;
  image: string | null;
  sort: number | null;
};

/**
 * Someone behind an event. `credit` is the card's wording, e.g. "Hosted by".
 * `voice` (a Meet the Voices slug) or `host` (a host's name) points to a
 * profile already on the site, which supplies the name, title and photo.
 */
export type EventPerson = {
  role: string;
  name?: string | null;
  credit?: string | null;
  bio?: string | null;
  title?: string | null;
  url?: string | null;
  /** A company's logo (file id), white on a transparent background. */
  logo?: string | null;
  voice?: string | null;
  host?: string | null;
};

/** The voices and hosts an event's people can point to (fetched only when one does). */
export async function eventProfiles(people: unknown): Promise<{ voices: Profile[]; hosts: Profile[] }> {
  const list = Array.isArray(people) ? people : [];
  const wantsVoice = list.some((p) => p && typeof p.voice === 'string' && p.voice.trim());
  const wantsHost = list.some((p) => p && typeof p.host === 'string' && p.host.trim());
  const [voices, hosts] = await Promise.all([wantsVoice ? getGuests(200) : [], wantsHost ? getHosts() : []]);
  return {
    voices: voices.map((v) => ({ name: v.name, designation: v.designation, photo: v.photo, slug: slugify(v.name) })),
    hosts: hosts.map((h) => ({ name: h.name, designation: h.designation ?? null, photo: h.photo })),
  };
}

export type EventStatus =
  | 'coming_soon'
  | 'details_soon'
  | 'early_bird'
  | 'registration_open'
  | 'rsvp_open'
  | 'invite_only'
  | 'sold_out'
  | 'waitlist'
  | 'postponed'
  | 'cancelled'
  | 'completed';

/** Optional collection — see cms/provision-extra.mjs. Falls back to [] when absent. */
export type Topic = {
  id: number;
  title: string;
  slug: string | null;
  blurb: string | null;
  image: string | null;
  sort: number | null;
};

/** Optional collection — the merch the shop lists, each mapped to a Gelato product. */
export type ShopProduct = {
  id: number;
  title: string;
  slug: string | null;
  description: string | null;
  gelato_product_uid: string;
  print_file_url: string | null;
  /** Main image, square: the product worn by a model. When set, the mockup is shown under it. */
  photo?: string | null;
  mockup: string | null;
  /** Back view (Gelato preview), shown under the front on the product page. */
  mockup_back?: string | null;
  /** More photos (file ids) of the first colour, shown after the main ones; other colours have their own. */
  gallery?: string[] | null;
  price: number | null;
  currency: string | null;
  /** Gelato placement -> design URL, e.g. { front, back, "sleeve-left" }. Empty = print_file_url on the front. */
  print_files: Record<string, string> | null;
  /** Price per currency, e.g. { INR: 999, USD: 39 }: India pays INR, every other market USD. */
  prices?: Record<string, number> | null;
  /** Sizes/colours, each its own Gelato product. Empty = one variant (gelato_product_uid). */
  variants: ShopVariant[] | null;
  /** Colour name -> its pictures, print files, swatch and note. */
  colorways?: Record<string, Colorway> | null;
  /** How Qikink makes it for India. Without it the product isn't sold in India. */
  qikink?: QikinkConfig | null;
  /** The specification shown on the product page; a colour can add or change rows. */
  specs?: Specs | null;
  status: string;
  sort: number | null;
};

/**
 * Specification rows, e.g. { "default": { "Fit": "Oversized", "Fabric": "…" }, "IN": { "Fabric": "…" } }:
 * "default" everywhere, a market's own rows over them (India's garments are Qikink's, not Gelato's).
 */
export type Specs = Partial<Record<string, Record<string, string>>>;

/** India orders are printed by Qikink; set per product in the CMS (shop_products.qikink). */
export type QikinkConfig = {
  /** Qikink SKU with {size} (and {color}) left open, e.g. "UHd-{color}-{size}". */
  sku_template: string;
  /** A colour made on another Qikink garment, e.g. { "Teal": "MRnHs-{color}-{size}" } beside an oversized black. */
  sku_templates?: Record<string, string> | null;
  /** Qikink's code per colour name, e.g. { "Black": "Bk" }. A colour without one isn't sold in India. */
  color_codes?: Record<string, string> | null;
  /** Sizes Qikink makes; any other size isn't sold in India. */
  sizes?: string[] | null;
  /** Where Qikink writes a size differently, e.g. { "2XL": "XXL" }. */
  size_codes?: Record<string, string> | null;
  /** Qikink print type: 1 = DTG. */
  print_type_id?: string | number | null;
  /** Print size in inches per placement ("fr" front, "bk" back). */
  designs?: Record<string, { width: number; height: number }> | null;
};

/** The files Gelato prints for a product: one per placement. */
export function printFilesOf(product: Pick<ShopProduct, 'print_files' | 'print_file_url'>): { type: string; url: string }[] {
  const map = product.print_files && typeof product.print_files === 'object' ? product.print_files : {};
  const files = Object.entries(map)
    .filter(([, url]) => typeof url === 'string' && url)
    .map(([type, url]) => ({ type, url }));
  if (files.length) return files;
  return product.print_file_url ? [{ type: 'default', url: product.print_file_url }] : [];
}

export type ShopVariant = {
  /** Gelato product UID for this exact size and colour ("in:..." for one only Qikink makes). */
  uid: string;
  size?: string | null;
  color?: string | null;
  /** Only sold in these markets, e.g. ["IN"] for a colour Gelato doesn't make. Empty = every market. */
  markets?: string[] | null;
};

/**
 * One colour of a product, keyed by the variants' colour name. A colour with
 * no files of its own uses the product's (the first colour). A colour's
 * mockup is a square front view.
 */
export type Colorway = {
  photo?: string | null;
  mockup?: string | null;
  /** Placement -> design URL, e.g. dark ink for a light garment. */
  print_files?: Record<string, string> | null;
  /** Swatch on the shop card, e.g. "#106E80". */
  swatch?: string | null;
  /** Shown when the colour is picked, e.g. "Regular fit". */
  note?: string | null;
  /** Rows of the specification that differ for this colour, e.g. another fabric. */
  specs?: Specs | null;
  /** More photos of this colour (file ids), shown after its main photo. */
  gallery?: string[] | null;
};

const colorwayOf = (product: Pick<ShopProduct, 'colorways'>, color?: string | null): Colorway | null =>
  (color && product.colorways && typeof product.colorways === 'object' ? product.colorways[color] : null) || null;

/**
 * The specification of one colour in one market: the product's rows, then the
 * colour's; within each, the market's own rows over the default ones. Rows keep
 * the product's order.
 */
export function specsFor(product: Pick<ShopProduct, 'specs' | 'colorways'>, color: string | null, market: string): [string, string][] {
  const rows = new Map<string, string>();
  for (const specs of [product.specs, colorwayOf(product, color)?.specs]) {
    for (const part of [specs?.default, specs?.[market]]) {
      for (const [label, value] of Object.entries(part && typeof part === 'object' ? part : {})) {
        if (typeof value === 'string' && value.trim()) rows.set(label, value);
      }
    }
  }
  return [...rows];
}

/** The files Gelato or Qikink print for one colour of a product. */
export function printFilesFor(product: Pick<ShopProduct, 'print_files' | 'print_file_url' | 'colorways'>, color?: string | null) {
  const own = colorwayOf(product, color)?.print_files;
  return own && Object.values(own).some(Boolean) ? printFilesOf({ print_files: own, print_file_url: null }) : printFilesOf(product);
}

/**
 * The pictures for one colour: its own when it has any (a teal hoodie never
 * shows the black model photo), else the product's. `gallery` is the further
 * photos shown after the main ones.
 */
export function imagesFor(
  product: Pick<ShopProduct, 'photo' | 'mockup' | 'mockup_back' | 'colorways' | 'gallery'>,
  color?: string | null,
): { photo: string | null; mockup: string | null; back: string | null; gallery: string[]; own: boolean } {
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string' && !!id) : []);
  const cw = colorwayOf(product, color);
  if (cw?.photo || cw?.mockup || ids(cw?.gallery).length) {
    return { photo: cw?.photo || null, mockup: cw?.mockup || null, back: null, gallery: ids(cw?.gallery), own: true };
  }
  return { photo: product.photo || null, mockup: product.mockup, back: product.mockup_back || null, gallery: ids(product.gallery), own: false };
}

/* ───────────────────────────── helpers ───────────────────────────── */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function photoUrl(
  record: { photo?: string | null; image?: string | null; mockup?: string | null },
  opts?: Parameters<typeof assetUrl>[1],
): string | null {
  return assetUrl(record.photo ?? record.image ?? record.mockup ?? null, opts);
}

/** Pull a YouTube video id out of any of the URL shapes people paste. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/,
  );
  return match ? match[1] : null;
}

const hostFields = 'host.id,host.name,host.photo,host.instagram_url';

/* ───────────────────────────── queries ───────────────────────────── */

export async function getHosts(): Promise<Host[]> {
  return readItems<Host>('hosts', {
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    // `*` rather than a field list: naming a field the CMS doesn't have yet
    // (designation/quote, added 2026-10) makes Directus reject the whole
    // query, which would blank the About page until the schema caught up.
    fields: '*',
    sort: 'id',
    limit: 50,
  });
}

/** Episodes the site shows. Anything else (e.g. "archived") is kept in the CMS but hidden. */
const SHOWN_EPISODES = ['published', 'coming_soon'];

export async function getEpisodes(limit = 100): Promise<Episode[]> {
  return readItems<Episode>('episodes', {
    filter: JSON.stringify({ status: { _in: SHOWN_EPISODES } }),
    // `*` so a newer column (spotify_url) comes through without breaking an older CMS.
    fields: `*,${hostFields}`,
    sort: '-publish_date,-id',
    limit,
  });
}

/** The topics (as slugs) that at least one of these episodes is tagged with. */
export function topicSlugsOf(episodes: Pick<Episode, 'topics'>[]): Set<string> {
  return new Set(episodes.flatMap((e) => (e.topics || '').split(',').map((t) => slugify(t.trim())).filter(Boolean)));
}

export async function getPublishedEpisodes(limit = 100): Promise<Episode[]> {
  const all = await getEpisodes(limit);
  return all.filter((e) => e.status === 'published');
}

/** The one episode the home page leads with: newest published, else newest upcoming. */
export function featuredOf(episodes: Episode[]): Episode | null {
  return episodes.find((e) => e.status === 'published') ?? episodes[0] ?? null;
}

export async function getFeaturedEpisode(): Promise<Episode | null> {
  return featuredOf(await getEpisodes(20));
}

/** The names of the voices on an episode, as the CMS links them. */
export function guestsOf(episode: Pick<Episode, 'id'> | null, guests: Guest[]): string[] {
  if (!episode) return [];
  return guests.filter((g) => g.episode && typeof g.episode === 'object' && g.episode.id === episode.id).map((g) => g.name);
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const all = await getEpisodes(200);
  return all.find((e) => slugify(e.title) === slug) ?? null;
}

// `*` for the guest's own columns (so newer ones like home_position come
// through without breaking older CMS schemas), plus the relations expanded.
const guestFields = `*,episode.id,episode.title,episode.status,${hostFields}`;

export async function getGuests(limit = 100): Promise<Guest[]> {
  const rows = await readItems<Guest>('guests', {
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    fields: guestFields,
    sort: 'id',
    limit,
  });
  // A guest still linked to a hidden (archived) episode has no episode to point to.
  return rows.map((g) =>
    g.episode && typeof g.episode === 'object' && !SHOWN_EPISODES.includes(g.episode.status) ? { ...g, episode: null } : g,
  );
}

/**
 * The guests the home page features, in the order set by `home_position`
 * in the CMS. If nobody has a position yet (or the field doesn't exist on
 * this CMS), falls back to the first three published guests so the section
 * is never empty just because nobody has curated it.
 */
export async function getHomeGuests(max = 3): Promise<Guest[]> {
  const curated = await readItems<Guest>('guests', {
    filter: JSON.stringify({
      _and: [{ status: { _eq: 'published' } }, { home_position: { _nnull: true } }],
    }),
    fields: guestFields,
    sort: 'home_position,id',
    limit: max,
  });
  if (curated.length > 0) return curated;
  return getGuests(max);
}

export async function getGuestBySlug(slug: string): Promise<Guest | null> {
  const all = await getGuests(200);
  return all.find((g) => slugify(g.name) === slug) ?? null;
}

export async function getChapters(): Promise<Chapter[]> {
  const rows = await readItems<Chapter>('chapters', { fields: '*', sort: 'id', limit: 50 });
  // `sort` (Dubai, USA, India) is set in the CMS; rows without one go last.
  return [...rows].sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || a.id - b.id);
}

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const all = await getChapters();
  return all.find((c) => (c.slug || slugify(c.city)) === slug) ?? null;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * An event whose date has passed reads as completed, whatever the CMS still
 * says: no form, no invitation, and it moves under Past Events. It is over at
 * its end time, or a day after it starts when there is none. Postponed and
 * cancelled events keep their own notices.
 */
export function settleStatus<T extends Pick<ChapterEvent, 'status' | 'starts_at' | 'ends_at'>>(event: T, now = Date.now()): T {
  if (event.status === 'postponed' || event.status === 'cancelled' || event.status === 'completed') return event;
  const end = event.ends_at ? new Date(event.ends_at).getTime() : event.starts_at ? new Date(event.starts_at).getTime() + DAY : NaN;
  return end < now ? { ...event, status: 'completed' } : event;
}

/** Published events, upcoming ones first; completed events sink to the end. */
export async function getEvents(): Promise<ChapterEvent[]> {
  const rows = await readItems<ChapterEvent>('events', {
    // The website policy only allows reading published rows; filtering here
    // as well keeps drafts out even if that permission is ever loosened.
    filter: JSON.stringify({ visibility: { _eq: 'published' } }),
    fields: '*,chapter.id,chapter.city,chapter.slug',
    sort: 'sort,starts_at,id',
    limit: 100,
  });
  return rows.map((e) => settleStatus(e)).sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'));
}

export function eventSlug(event: Pick<ChapterEvent, 'slug' | 'title'>): string {
  return event.slug || slugify(event.title);
}

export async function getEventBySlug(slug: string): Promise<ChapterEvent | null> {
  const all = await getEvents();
  return all.find((e) => eventSlug(e) === slug) ?? null;
}

/** The event a private invitation link belongs to. Codes shorter than 8 characters are never valid. */
export async function getEventByInviteCode(code: string): Promise<ChapterEvent | null> {
  const clean = code.trim();
  if (clean.length < 8) return null;
  const all = await getEvents();
  return all.find((e) => typeof e.invite_code === 'string' && e.invite_code.trim() === clean) ?? null;
}

export async function getTopics(): Promise<Topic[]> {
  return readItems<Topic>('topics', {
    fields: 'id,title,slug,blurb,image,sort',
    sort: 'sort,id',
    limit: 30,
  });
}

export async function getShopProducts(): Promise<ShopProduct[]> {
  return readItems<ShopProduct>('shop_products', {
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    // '*' rather than a list, so the shop keeps working on a CMS that doesn't
    // have the newer `variants` field yet.
    fields: '*',
    sort: 'sort,id',
    limit: 60,
  });
}

export async function getShopProductBySlug(slug: string): Promise<ShopProduct | null> {
  const all = await getShopProducts();
  return all.find((p) => (p.slug || slugify(p.title)) === slug) ?? null;
}
