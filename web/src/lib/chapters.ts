/**
 * AntiSocial Chapters — the forms and statuses behind /chapters.
 *
 * Shared by the client forms (to render fields) and the API routes (to
 * validate and whitelist what reaches the CMS), so a field only ever has to be
 * defined once. No server-only imports here.
 */

import type { EventStatus } from './content';

/* ─────────────────────────── legal links ─────────────────────────── */

/**
 * Consent checkboxes link here: the client's final Terms of Use and Privacy
 * Policy. Applying to start a chapter or organise an event is accepting the
 * Chapter Partner Program clause of the Terms (clause 11), so those link to it.
 */
export const LEGAL = {
  privacy: '/privacy',
  terms: '/terms',
  eventTerms: '/terms',
  chapterTerms: '/terms#chapter-partner-program',
};

/* ─────────────────────────── event statuses ──────────────────────── */

/**
 * What a visitor can do for an event in each status:
 *  - interest: no confirmed details yet; registering only gets updates
 *  - booking:  registration is open; the team allocates places
 *  - rsvp:     by invitation; every RSVP is reviewed, and confirmed guests
 *              are emailed the venue (no capacity count, no payment)
 *  - waitlist: full; registrations join the waitlist
 *  - private:  invite only; the team emails each guest their RSVP link, so
 *              there is no public form, only a way to write to the team
 *  - soon:     the details are still being shaped: no form and no programme
 *              yet, only "join the community to hear first"
 *  - closed:   postponed, cancelled or completed — no form
 *
 * A status can also set the form's opening note and its button.
 */
export type RegistrationMode = 'interest' | 'booking' | 'rsvp' | 'waitlist' | 'private' | 'soon' | 'closed';

/** The modes with a public registration form. */
export type FormMode = Exclude<RegistrationMode, 'closed' | 'private' | 'soon'>;

export const EVENT_STATUS: Record<
  EventStatus,
  { label: string; mode: RegistrationMode; notice?: string; formNote?: string; formTitle?: string; cta?: string }
> = {
  coming_soon: { label: 'Coming Soon', mode: 'interest' },
  details_soon: {
    label: 'Details Soon',
    mode: 'soon',
    notice: 'We are still shaping this one. Join the community and you will hear first.',
  },
  early_bird: {
    label: 'Early Bird Open',
    mode: 'interest',
    cta: 'Reserve Your Spot',
    formTitle: 'Early Bird Registration',
    formNote: 'Early bird registration is open. After you register, we email you shortly with all the details.',
  },
  registration_open: { label: 'Registration Open', mode: 'booking' },
  rsvp_open: { label: 'RSVP Open', mode: 'rsvp' },
  invite_only: { label: 'Invite Only', mode: 'private' },
  sold_out: { label: 'Sold Out', mode: 'waitlist' },
  waitlist: { label: 'Waitlist', mode: 'waitlist' },
  postponed: {
    label: 'Postponed',
    mode: 'closed',
    notice: 'This event has been postponed. Everyone registered will be emailed the new details.',
  },
  cancelled: {
    label: 'Cancelled',
    mode: 'closed',
    notice: 'This event has been cancelled. Everyone registered has been notified.',
  },
  completed: {
    label: 'Completed',
    mode: 'closed',
    notice: 'This conversation has happened. Thank you to everyone who was in the room.',
  },
};

export function statusOf(status: string | null | undefined) {
  return EVENT_STATUS[(status as EventStatus) || 'coming_soon'] ?? EVENT_STATUS.coming_soon;
}

export const TBA = 'To Be Announced';

export type TicketPrice = { amount: number; currency: string };

/** The per-person price, or null for a free event. */
export function ticketPrice(event: { ticket_price: number | string | null; ticket_currency: string | null }): TicketPrice | null {
  const amount = Number(event.ticket_price);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: (event.ticket_currency || 'INR').toUpperCase() };
}

export function formatPrice({ amount, currency }: TicketPrice): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Most places one person can book in a single payment. */
export const MAX_PER_BOOKING = 10;

/**
 * "Fri, 14 Nov 2026" and "7:00 PM GMT+4" in the event's own timezone, so a
 * visitor in another country sees the local start time the organisers mean.
 * Null when no date is set yet.
 */
export function formatEventDate(startsAt: string | null, timezone: string | null): { date: string; time: string } | null {
  if (!startsAt) return null;
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return null;
  const timeZone = timezone || 'UTC';
  try {
    return {
      date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }),
    };
  } catch {
    return { date: d.toUTCString(), time: '' };
  }
}

/**
 * Everything the event pages show about when an event is, in its own
 * timezone: "Tue, 3 Nov 2026", "11:30 AM – 3:00 PM GMT" (null while the time
 * is to be announced), and the parts for the large "03.11" date.
 */
export function eventWhen(event: {
  starts_at: string | null;
  ends_at?: string | null;
  time_tba?: boolean | null;
  timezone: string | null;
}) {
  const base = formatEventDate(event.starts_at, event.timezone);
  if (!base) return null;
  const start = new Date(event.starts_at!);
  const timeZone = event.timezone || 'UTC';
  const part = (opts: Intl.DateTimeFormatOptions) => {
    try {
      return start.toLocaleString('en-GB', { ...opts, timeZone });
    } catch {
      return start.toLocaleString('en-GB', { ...opts, timeZone: 'UTC' });
    }
  };
  let time: string | null = null;
  if (!event.time_tba) {
    const end = event.ends_at ? new Date(event.ends_at) : null;
    if (end && !Number.isNaN(end.getTime()) && end > start) {
      try {
        const clock = (d: Date, zone: boolean) =>
          d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone, ...(zone ? { timeZoneName: 'short' } : {}) });
        time = `${clock(start, false)} – ${clock(end, true)}`;
      } catch {
        time = base.time;
      }
    } else {
      time = base.time;
    }
  }
  return {
    date: base.date,
    time,
    day: part({ day: '2-digit' }),
    month: part({ month: '2-digit' }),
    monthName: part({ month: 'short' }),
    weekday: part({ weekday: 'short' }),
    year: part({ year: 'numeric' }),
  };
}

/** One per line, blank lines dropped; null when empty. */
export function textLines(value: string | null | undefined): string[] | null {
  const out = (value || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return out.length ? out : null;
}

/**
 * Large statement text: one line each, then, after a blank line, an optional
 * caption. Null when empty.
 */
export function statement(value: string | null | undefined): { lines: string[]; caption: string | null } | null {
  const [head, ...rest] = (value || '').split(/\n\s*\n/);
  const lines = textLines(head);
  if (!lines) return null;
  const caption = rest.join(' ').replace(/\s+/g, ' ').trim();
  return { lines, caption: caption || null };
}

/** "Dubai, UAE": the city with the country, or the region when it adds something. */
export function eventPlace(event: { city: string | null; region: string | null; country?: string | null }): string {
  const extra = event.country || (event.region && event.region !== event.city && !/antisocial/i.test(event.region) ? event.region : null);
  return [event.city, extra].filter(Boolean).join(', ');
}

/** A profile already on the site that an event's person can point to. */
export type Profile = { name: string; designation?: string | null; photo?: string | null; slug?: string };

/** One person behind an event, ready to show: credit for the card, title, photo and link for the page. */
export type PersonCard = {
  role: string;
  name: string;
  credit: string;
  bio: string | null;
  title: string | null;
  photo: string | null;
  /** A company's logo (file id), white on a transparent background; shown on a dark tile. */
  logo: string | null;
  href: string | null;
};

/**
 * The people behind an event, with the wording for their credit ("Hosted by").
 * A person can point to a profile already on the site: `"voice": "dr-anmol-kapoor"`
 * (Meet the Voices) or `"host": "Jessica Hillier"` (the hosts on About); their
 * name, title and photo then come from there, and the card links to it. Others
 * can have their own `title`, `url` and `logo` (a file id).
 * Entries with no name and no profile are left out.
 */
export function eventPeople(people: unknown, profiles: { voices?: Profile[]; hosts?: Profile[] } = {}): PersonCard[] {
  if (!Array.isArray(people)) return [];
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return people
    .filter((p) => p && typeof p === 'object')
    .map((p) => {
      const voiceSlug = text(p.voice);
      const hostName = text(p.host);
      const voice = voiceSlug ? profiles.voices?.find((v) => v.slug === voiceSlug) : undefined;
      // A host is found by full name, or by first name when that is all the event gives.
      const host = hostName
        ? profiles.hosts?.find((h) => same(h.name, hostName)) ?? profiles.hosts?.find((h) => same(h.name.split(/\s+/)[0], hostName))
        : undefined;
      const profile = voice ?? host;
      const role = String(p.role || '').trim();
      const r = role.toLowerCase();
      const credit =
        text(p.credit) ||
        (r.includes('co-organis') || r.includes('partner')
          ? 'Co-organised with'
          : r.includes('organis')
            ? 'Organised by'
            : r.includes('host')
              ? 'Hosted by'
              : r.includes('moderat')
                ? 'Moderated by'
                : role || 'With');
      return {
        role,
        name: profile?.name || text(p.name) || '',
        credit,
        bio: text(p.bio),
        title: text(p.title) || text(profile?.designation) || null,
        photo: profile?.photo || null,
        logo: profile ? null : text(p.logo),
        href: voice ? `/voices/${voiceSlug}` : host ? '/about#hosts' : text(p.url),
      };
    })
    .filter((p) => p.name);
}

/* ─────────────────────────── form fields ─────────────────────────── */

export type FieldKind = 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select';

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Takes half the row on wider screens. */
  half?: boolean;
  /** Only shown when the event takes bookings (not for interest-only). */
  bookingOnly?: boolean;
  /** Only shown for invitation events, where the team picks the guests. */
  rsvpOnly?: boolean;
  maxLength?: number;
};

const contact: FieldDef[] = [
  { name: 'full_name', label: 'Full name', kind: 'text', required: true, half: true, maxLength: 200 },
  { name: 'email', label: 'Email address', kind: 'email', required: true, half: true, maxLength: 320 },
  {
    name: 'phone',
    label: 'Phone (with country code)',
    kind: 'tel',
    required: true,
    half: true,
    placeholder: '+971 50 123 4567',
    maxLength: 40,
  },
];

const place: FieldDef[] = [
  { name: 'city', label: 'City', kind: 'text', required: true, half: true, maxLength: 120 },
  { name: 'country', label: 'Country', kind: 'text', required: true, half: true, maxLength: 120 },
];

/** Event registration — interest, booking, RSVP and waitlist all use this form. */
export const REGISTRATION_FIELDS: FieldDef[] = [
  ...contact,
  ...place,
  { name: 'organisation', label: 'Organisation', kind: 'text', required: true, half: true, maxLength: 200, rsvpOnly: true },
  { name: 'job_title', label: 'Role', kind: 'text', required: true, half: true, maxLength: 200, rsvpOnly: true },
  {
    name: 'attendees',
    label: 'Number of attendees',
    kind: 'number',
    required: true,
    half: true,
    bookingOnly: true,
  },
  {
    name: 'accessibility_needs',
    label: 'Accessibility requirements (optional)',
    kind: 'textarea',
    placeholder: 'Anything that would make it easier for you to attend.',
    maxLength: 1000,
  },
];

/** The registration fields for one mode, shared by the form and the API route. */
export function registrationFields(mode: RegistrationMode): FieldDef[] {
  return REGISTRATION_FIELDS.filter((f) => (!f.bookingOnly || mode === 'booking') && (!f.rsvpOnly || mode === 'rsvp'));
}

export type ApplicationType = 'chapter_founder' | 'organiser' | 'speaker' | 'local_team' | 'chapter_partner';

export type ApplicationConfig = {
  type: ApplicationType;
  /** URL segment under /chapters/apply/ (the organiser form lives at /chapters/organise). */
  slug: string;
  title: string;
  blurb: string;
  heading: string;
  accent: string;
  lede: string;
  submitLabel: string;
  confirmation: string;
  fields: FieldDef[];
  /** Whether a proposal file can be attached. */
  allowsUpload?: boolean;
  /** Extra line next to the consent box. */
  reviewNote?: string;
};

export const APPLICATIONS: Record<ApplicationType, ApplicationConfig> = {
  // The five questions from the chapter brief: where, why, who, what, how.
  chapter_founder: {
    type: 'chapter_founder',
    slug: 'start',
    title: 'Start a Chapter',
    blurb: 'Ready to lead? Start a chapter in your city and create a platform for voices that deserve to be heard.',
    heading: 'Start a Chapter',
    accent: 'in Your City.',
    lede: 'Ready to lead? Start a chapter in your city and create a platform for voices that deserve to be heard. Answer five questions: where, why, who, what and how.',
    submitLabel: 'Send My Expression of Interest',
    confirmation:
      'Your expression of interest is in. Next step: someone from the central team will contact you to arrange a founder orientation call, where we check fit and explain the chapter standards. Applying does not create a chapter or authorise use of the chapter brand.',
    reviewNote:
      'I understand my application will be reviewed, and that submitting it does not create a chapter or grant permission to use the AntiSocialTalks brand. I agree to the',
    fields: [
      ...contact,
      { name: 'city', label: 'Where: city for the chapter', kind: 'text', required: true, half: true, maxLength: 120 },
      { name: 'country', label: 'Where: country', kind: 'text', required: true, half: true, maxLength: 120 },
      { name: 'why_mission', label: 'Why: why does this mission matter to you?', kind: 'textarea', required: true, maxLength: 3000 },
      {
        name: 'team_type',
        label: 'Who: are you starting it alone or with a founding team?',
        kind: 'select',
        required: true,
        options: [
          { value: 'alone', label: 'On my own, for now' },
          { value: 'founding_team', label: 'With a founding team' },
        ],
      },
      { name: 'team_details', label: 'Your founding team (if any)', kind: 'textarea', placeholder: 'Names and what each person brings.', maxLength: 2000 },
      {
        name: 'chapter_plans',
        label: 'What: which conversations and events do you want to create?',
        kind: 'textarea',
        required: true,
        maxLength: 3000,
      },
      {
        name: 'first_steps',
        label: 'How: your first steps (speakers, venues, connections)',
        kind: 'textarea',
        required: true,
        maxLength: 3000,
      },
      { name: 'links', label: 'Website or social links (optional)', kind: 'textarea', placeholder: 'One per line', maxLength: 1000 },
    ],
  },
  organiser: {
    type: 'organiser',
    slug: 'organise',
    title: 'Create Your Own Event with AntiSocial',
    blurb: 'Bring the conversation to your city.',
    heading: 'Bring the Conversation',
    accent: 'to Your City.',
    lede: 'Have a community, a powerful theme or voices your city needs to hear? Apply to organise an event with AntiSocialTalks. Share your idea, introduce your team and tell us how you would bring people together.',
    submitLabel: 'Submit Your Event Proposal',
    confirmation:
      'Your idea is in. Our team will review your proposal and contact you about the next steps. Submission does not confirm approval to organise an AntiSocialTalks event.',
    allowsUpload: true,
    reviewNote:
      'I understand my proposal is subject to review, and that submitting it does not approve an event or grant permission to use the AntiSocialTalks brand. I agree to the',
    fields: [
      ...contact,
      { name: 'organisation', label: 'Organisation (if any)', kind: 'text', half: true, maxLength: 200 },
      ...place,
      { name: 'event_title', label: 'Event title', kind: 'text', required: true, maxLength: 200 },
      { name: 'theme', label: 'Theme', kind: 'text', required: true, maxLength: 200 },
      {
        name: 'concept',
        label: 'Short concept',
        kind: 'textarea',
        required: true,
        placeholder: 'What is the conversation, and why does your city need it?',
        maxLength: 3000,
      },
      { name: 'preferred_timeframe', label: 'Preferred date or timeframe', kind: 'text', required: true, half: true, maxLength: 200 },
      { name: 'audience_size', label: 'Expected audience size', kind: 'text', required: true, half: true, placeholder: 'e.g. 80–120', maxLength: 100 },
      { name: 'intended_audience', label: 'Who is it for?', kind: 'text', required: true, maxLength: 300 },
      {
        name: 'format',
        label: 'Proposed format',
        kind: 'select',
        required: true,
        options: [
          { value: 'speaker_talks', label: 'Speaker talks' },
          { value: 'panel', label: 'Panel discussion' },
          { value: 'community_conversation', label: 'Community conversation' },
          { value: 'other', label: 'Other' },
        ],
      },
      { name: 'suggested_speakers', label: 'Suggested speakers (if any)', kind: 'textarea', maxLength: 2000 },
      {
        name: 'experience',
        label: 'Organising experience and team',
        kind: 'textarea',
        required: true,
        placeholder: 'What have you organised before, and who is on your team?',
        maxLength: 3000,
      },
      { name: 'venue_availability', label: 'Venue availability', kind: 'text', required: true, placeholder: 'Do you have a venue in mind or confirmed?', maxLength: 500 },
      { name: 'budget', label: 'Estimated budget, funding or sponsorship plans', kind: 'textarea', maxLength: 2000 },
      { name: 'links', label: 'Website or social links', kind: 'textarea', placeholder: 'One per line', maxLength: 1000 },
    ],
  },
  // "Nominate a Voice" from the chapter brief: self-nominations and nominations by others.
  speaker: {
    type: 'speaker',
    slug: 'speak',
    title: 'Apply to Speak / Nominate a Speaker',
    blurb: 'Know someone with a remarkable idea?',
    heading: 'Nominate a Voice',
    accent: 'the World Hasn’t Heard Yet.',
    lede: 'Know someone with a remarkable idea, or have one yourself? Nominate them, or yourself. We judge the contribution, not fame: a clear idea, honest communication, willingness to prepare and fit for the audience.',
    submitLabel: 'Send the Nomination',
    confirmation:
      'Thanks, the nomination is in. Next step: the chapter team reviews it, and if it fits a programme we contact the nominee to talk it through. Nothing about them is published without their consent.',
    reviewNote:
      'I am nominating myself, or the nominee knows I am sharing their details. I understand nothing about the nominee will be published without their consent. I agree to the',
    fields: [
      {
        name: 'nomination_type',
        label: 'Who are you nominating?',
        kind: 'select',
        required: true,
        options: [
          { value: 'self', label: 'Myself' },
          { value: 'other', label: 'Someone else' },
        ],
      },
      { name: 'nominee_name', label: '1. Nominee’s name', kind: 'text', required: true, half: true, maxLength: 200 },
      { name: 'organisation', label: '1. Affiliation (organisation, school, community)', kind: 'text', half: true, maxLength: 200 },
      { name: 'city', label: '2. City', kind: 'text', required: true, half: true, maxLength: 120 },
      { name: 'country', label: '2. Country', kind: 'text', required: true, half: true, maxLength: 120 },
      { name: 'topic', label: '3. Proposed idea, story or subject', kind: 'text', required: true, maxLength: 300 },
      { name: 'why_it_matters', label: '4. Why it matters to a wider audience', kind: 'textarea', required: true, maxLength: 2000 },
      { name: 'bio', label: '5. Short bio or background', kind: 'textarea', required: true, maxLength: 2000 },
      { name: 'links', label: '6. Links to existing work', kind: 'textarea', placeholder: 'One per line', maxLength: 1000 },
      {
        name: 'spoken_before',
        label: '7. Has the nominee spoken publicly before?',
        kind: 'select',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      { name: 'full_name', label: '8. Your name', kind: 'text', required: true, half: true, maxLength: 200 },
      { name: 'email', label: '8. Your email', kind: 'email', required: true, half: true, maxLength: 320 },
      {
        name: 'phone',
        label: '8. Your phone (with country code)',
        kind: 'tel',
        required: true,
        half: true,
        placeholder: '+971 50 123 4567',
        maxLength: 40,
      },
    ],
  },
  local_team: {
    type: 'local_team',
    slug: 'local-team',
    title: 'Join the Local Team / Become a Volunteer',
    blurb: 'Want to help make it happen?',
    heading: 'Become a Volunteer',
    accent: 'in Your City.',
    lede: 'Want to help make it happen? Chapters need help with venues, production, hosting, design and logistics. Tell us what you can do.',
    submitLabel: 'Join the Team',
    confirmation:
      'Thanks for offering to help. Next step: the chapter team in your city, or the central team if there isn’t one yet, will contact you with what is coming up and where you could fit.',
    fields: [
      ...contact,
      ...place,
      { name: 'skills', label: 'Skills', kind: 'textarea', required: true, placeholder: 'Production, hosting, design, social, logistics…', maxLength: 1500 },
      { name: 'availability', label: 'Availability', kind: 'text', required: true, placeholder: 'e.g. weekends, evenings', maxLength: 300 },
    ],
  },
  chapter_partner: {
    type: 'chapter_partner',
    slug: 'partner',
    title: 'Partner with a Chapter',
    blurb: 'For venues, sponsors and organisations that want to support a local chapter.',
    heading: 'Partner with a Chapter',
    accent: 'in Your City.',
    lede: 'For venues, sponsors and organisations that want to support a local chapter.',
    submitLabel: 'Send Partnership Enquiry',
    confirmation:
      'Received. Next step: our partnerships team reviews it and contacts you to agree expectations in advance, before anything is announced.',
    fields: [
      ...contact,
      { name: 'organisation', label: 'Organisation', kind: 'text', required: true, half: true, maxLength: 200 },
      ...place,
      {
        name: 'partnership_interest',
        label: 'What kind of partnership?',
        kind: 'textarea',
        required: true,
        placeholder: 'Venue, sponsorship, media, something else?',
        maxLength: 2000,
      },
    ],
  },
};

export function applicationBySlug(slug: string): ApplicationConfig | undefined {
  return Object.values(APPLICATIONS).find((a) => a.slug === slug);
}

/** "From an Idea to a City Conversation" — shown on /chapters and beside the organiser form. */
export const ORGANISING_STEPS = [
  { title: 'Share Your Idea', body: 'Submit your city, theme and event proposal.' },
  { title: 'Meet Our Team', body: 'Discuss the concept, audience and organising plan.' },
  {
    title: 'Build the Event Together',
    body: 'Approved organisers agree the format, responsibilities, brand guidelines and relevant agreements.',
  },
  { title: 'Open the Doors', body: 'After final approval, publish the event and begin registrations.' },
];

/** The forms served at /chapters/apply/[slug]. Start a Chapter and the organiser form have their own pages. */
export const COMMUNITY_OPTIONS: ApplicationType[] = ['speaker', 'local_team', 'chapter_partner'];

/** Where each application form lives. */
export function applicationHref(type: ApplicationType): string {
  if (type === 'chapter_founder') return '/chapters/start';
  if (type === 'organiser') return '/chapters/organise';
  return `/chapters/apply/${APPLICATIONS[type].slug}`;
}

/** Upload rules for the organiser's optional proposal. */
export const PROPOSAL_UPLOAD = {
  maxBytes: 10 * 1024 * 1024,
  accept: '.pdf,.doc,.docx,.ppt,.pptx',
  types: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

/* ─────────────────────────── validation ──────────────────────────── */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/**
 * Whitelist + validate submitted values against a field list. Returns the
 * clean payload, or the first problem as a sentence for the visitor.
 */
export function validateFields(
  fields: FieldDef[],
  input: Record<string, unknown>,
): { ok: true; values: Record<string, string | number | null> } | { ok: false; error: string } {
  const values: Record<string, string | number | null> = {};

  for (const field of fields) {
    const raw = input[field.name];
    const text = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();

    if (!text) {
      if (field.required) return { ok: false, error: `Please fill in “${field.label}”.` };
      values[field.name] = null;
      continue;
    }

    if (field.maxLength && text.length > field.maxLength) {
      return { ok: false, error: `“${field.label}” is too long.` };
    }
    if (field.kind === 'email' && !EMAIL.test(text)) return { ok: false, error: 'Please enter a valid email address.' };
    if (field.kind === 'tel' && !PHONE.test(text)) {
      return { ok: false, error: 'Please enter a phone number with its country code, e.g. +971 50 123 4567.' };
    }
    if (field.kind === 'url' && !/^https?:\/\/\S+$/i.test(text)) {
      return { ok: false, error: `“${field.label}” should be a full link starting with https://` };
    }
    if (field.kind === 'select' && !field.options?.some((o) => o.value === text)) {
      return { ok: false, error: `Please choose an option for “${field.label}”.` };
    }
    if (field.kind === 'number') {
      const n = Number(text);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return { ok: false, error: `“${field.label}” should be a number between 1 and 20.` };
      }
      values[field.name] = n;
      continue;
    }

    values[field.name] = text;
  }

  return { ok: true, values };
}
