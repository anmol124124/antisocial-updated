import 'server-only';
import { assetUrl, readItems, readSingleton } from './directus';
import { isSubmissionType, type SubmissionType } from './community';
import { teamInbox } from './mailer';

/**
 * Site-wide settings and the page copy the team edits in the CMS: social
 * profiles, the home page pictures and lists, About values, the community
 * forms, the Roadshow route and the Chapters guide. (Episodes, guests, events
 * and products are in content.ts.) Like everything read from Directus, a
 * missing or unreachable CMS gives null / [] and the page leaves that part out.
 */

/* ───────────────────────────── settings ───────────────────────────── */

export type SocialKey = 'instagram' | 'youtube' | 'spotify' | 'tiktok' | 'x' | 'linkedin';
export type SocialLink = { key: SocialKey; label: string; href: string };

type SiteSettingsRow = {
  contact_email: string | null;
  share_image: string | null;
} & Partial<Record<`${SocialKey}_url`, string | null>>;

export type SiteSettings = {
  contactEmail: string | null;
  /** Every official profile that has a link, in display order (hero and footer). */
  social: SocialLink[];
  /** Directus file id of the default share picture, or null. */
  shareImage: string | null;
};

const SOCIAL_ORDER: { key: SocialKey; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'x', label: 'X' },
  { key: 'linkedin', label: 'LinkedIn' },
];

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await readSingleton<SiteSettingsRow>('site_settings');
  return {
    contactEmail: row?.contact_email?.trim() || null,
    social: SOCIAL_ORDER.flatMap(({ key, label }) => {
      const href = row?.[`${key}_url`]?.trim();
      return href ? [{ key, label, href }] : [];
    }),
    shareImage: row?.share_image || null,
  };
}

/**
 * Who visitors write to about an event: the event's own address, else the
 * site's (Site settings → Contact email), else the team inbox (TEAM_NOTIFY_EMAIL).
 */
export async function contactEmailFor(event?: { contact_email?: string | null } | null): Promise<string> {
  const own = event?.contact_email?.trim();
  if (own) return own;
  return (await getSiteSettings()).contactEmail || teamInbox() || '';
}

/** The YouTube channel, for "Watch on YouTube" buttons. Null hides them. */
export const youtubeChannel = (settings: SiteSettings): string | null =>
  settings.social.find((s) => s.key === 'youtube')?.href ?? null;

/* ───────────────────────────── home page ──────────────────────────── */

type HomePageRow = {
  hero_image: string | null;
  hero_image_alt: string | null;
  teaser_video: string | null;
  teaser_poster: string | null;
  teaser_label: string | null;
  topics: string[] | null;
  question_image: string | null;
  question_image_alt: string | null;
};

export type Picture = { src: string; alt: string };

export type Teaser = { src: string; poster: string | null; captions: string | null; label: string };

export type HomePage = {
  hero: Picture | null;
  /** "What We Talk About", also the words scrolling under the hero. */
  topics: string[];
  question: Picture | null;
  /** The clip shown until the first episode is published. */
  teaser: Teaser | null;
};

const picture = (file: string | null, alt: string | null, width: number): Picture | null => {
  const src = assetUrl(file, { width, quality: 85 });
  return src ? { src, alt: alt || '' } : null;
};

export async function getHomePage(): Promise<HomePage> {
  const row = await readSingleton<HomePageRow>('home_page');
  return {
    hero: picture(row?.hero_image ?? null, row?.hero_image_alt ?? null, 1600),
    topics: (row?.topics || []).map((t) => t.trim()).filter(Boolean),
    question: picture(row?.question_image ?? null, row?.question_image_alt ?? null, 1400),
    teaser: row?.teaser_video
      ? {
          src: `/api/assets/${row.teaser_video}`,
          poster: assetUrl(row.teaser_poster, { width: 1600, quality: 85 }),
          captions: null,
          label: row.teaser_label || 'AntiSocialTalks teaser',
        }
      : null,
  };
}

export type HomePillar = {
  title: string;
  blurb: string;
  cta: string;
  href: string;
  image: string | null;
  alt: string;
  position?: string;
};

type HomePillarRow = {
  title: string;
  blurb: string | null;
  cta_label: string | null;
  link: string;
  image: string | null;
  image_alt: string | null;
  image_position: string | null;
};

export async function getHomePillars(): Promise<HomePillar[]> {
  const rows = await readItems<HomePillarRow>('home_pillars', { sort: 'sort,id', limit: 12 });
  return rows.map((r) => ({
    title: r.title,
    blurb: r.blurb || '',
    cta: r.cta_label || '',
    href: r.link,
    image: assetUrl(r.image, { width: 900, quality: 85 }),
    alt: r.image_alt || '',
    ...(r.image_position ? { position: r.image_position } : {}),
  }));
}

/* ─────────────────────────────── About ─────────────────────────────── */

export type Value = { title: string; body: string };

export async function getAboutValues(): Promise<Value[]> {
  const rows = await readItems<{ title: string; body: string | null }>('about_values', { sort: 'sort,id', limit: 20 });
  return rows.map((r) => ({ title: r.title, body: r.body || '' }));
}

/* ───────────────────────────── community ───────────────────────────── */


export type Way = {
  slug: SubmissionType;
  title: string;
  /** Strong verb + specific noun, shown on the card that opens this form. */
  cta: string;
  blurb: string;
  heading: string;
  accent: string;
  lede: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  showInterest?: boolean;
};

type WayRow = {
  slug: string;
  title: string;
  cta: string | null;
  blurb: string | null;
  heading: string | null;
  accent: string | null;
  lede: string | null;
  message_label: string | null;
  message_placeholder: string | null;
  submit_label: string | null;
  show_interest: boolean | null;
};

/** The community calls to action and the copy each form page uses, in the CMS's order. */
export async function getCommunityWays(): Promise<Way[]> {
  const rows = await readItems<WayRow>('community_ways', { sort: 'sort,id', limit: 20 });
  return rows
    .filter((r) => isSubmissionType(r.slug))
    .map((r) => ({
      slug: r.slug as SubmissionType,
      title: r.title,
      cta: r.cta || '',
      blurb: r.blurb || '',
      heading: r.heading || '',
      accent: r.accent || '',
      lede: r.lede || '',
      messageLabel: r.message_label || '',
      messagePlaceholder: r.message_placeholder || '',
      submitLabel: r.submit_label || '',
      ...(r.show_interest ? { showInterest: true } : {}),
    }));
}

/* ───────────────────────────── Roadshow ────────────────────────────── */

export type RoadshowStop = { city: string; note: string };

export async function getRoadshowStops(): Promise<RoadshowStop[]> {
  const rows = await readItems<{ city: string; note: string | null }>('roadshow_stops', { sort: 'sort,id', limit: 50 });
  return rows.map((r) => ({ city: r.city, note: r.note || '' }));
}

/* ─────────────────────────── Chapters guide ────────────────────────── */

export type TitledText = { title: string; body: string };
export type Linked = { href: string; title: string; body: string };

export type ChapterGuide = {
  mission: string;
  vision: string;
  network: string;
  framework: string;
  /** What a chapter does. */
  activities: TitledText[];
  /** The questions on the Start a Chapter form. */
  founderQuestions: { label: string; body: string }[];
  /** From expression of interest to a growing chapter. */
  founderSteps: string[];
  founderStepsNote: string;
  first30Days: { days: string; title: string; body: string }[];
  first30DaysNote: string;
  /** How to Organise an Event: the repeatable first conversation. */
  runsheet: { time: string; title: string; body: string }[];
  eventGuideSteps: string[];
  eventGuideNote: string;
  talentSources: string;
  speakerQualities: string;
  /** The actions that close every Chapters page. The first is the primary one. */
  joinActions: Linked[];
  /** The guide pages, linked from the Chapters hub. */
  guides: Linked[];
};

type ChapterGuideRow = Partial<{
  mission: string | null;
  vision: string | null;
  network: string | null;
  framework: string | null;
  activities: TitledText[] | null;
  founder_questions: { label: string; body: string }[] | null;
  founder_steps: string[] | null;
  founder_steps_note: string | null;
  first_30_days: { days: string; title: string; body: string }[] | null;
  first_30_days_note: string | null;
  runsheet: { time: string; title: string; body: string }[] | null;
  event_guide_steps: string[] | null;
  event_guide_note: string | null;
  talent_sources: string | null;
  speaker_qualities: string | null;
  join_actions: Linked[] | null;
  guides: Linked[] | null;
}>;

const list = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

export async function getChapterGuide(): Promise<ChapterGuide> {
  const g = (await readSingleton<ChapterGuideRow>('chapter_guide')) || {};
  return {
    mission: g.mission || '',
    vision: g.vision || '',
    network: g.network || '',
    framework: g.framework || '',
    activities: list(g.activities),
    founderQuestions: list(g.founder_questions),
    founderSteps: list(g.founder_steps),
    founderStepsNote: g.founder_steps_note || '',
    first30Days: list(g.first_30_days),
    first30DaysNote: g.first_30_days_note || '',
    runsheet: list(g.runsheet),
    eventGuideSteps: list(g.event_guide_steps),
    eventGuideNote: g.event_guide_note || '',
    talentSources: g.talent_sources || '',
    speakerQualities: g.speaker_qualities || '',
    joinActions: list(g.join_actions),
    guides: list(g.guides),
  };
}
