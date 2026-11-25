#!/usr/bin/env node
/**
 * Content update, 2026-10-08 — "AntiSocialTalks Website Suggestions" (revised):
 * every voice's designation, tagline (guests.teaser) and description
 * (guests.bio). Gauri Singh is renamed to "Gauri G" as the document asks.
 *
 *   DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
 *   node scripts/migrations/content-update-2026-10-08.mjs
 *
 * Idempotent: rows are matched by name (or a former name), and re-running just
 * writes the same values again. Dr. Anmol Kapoor's copy was supplied separately
 * on 2026-10-09 and is included here.
 *
 * Copy is as supplied, with only punctuation fixed (a missing comma before
 * "one where", "client-facing", "self-expression").
 */

const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

const VOICES = [
  {
    name: 'Abdu Rozik',
    designation: 'Singer | Actor | Boxer | Entrepreneur',
    teaser: 'You’ve seen the headlines. Have you heard him?',
    bio: 'Abdu Rozik brings together music, acting, boxing and entrepreneurship in a career that crosses several worlds. Each role offers a different way to understand the person behind the familiar face. His AntiSocialTalks conversation creates space to look beyond labels and explore ambition, identity and life in the public eye. This is an opportunity to hear his perspective beyond the performances audiences already know.',
  },
  {
    name: 'Shresta Iyer',
    designation: 'Content Creator | Reality Show Artist',
    teaser: 'Your feed knows her face. It doesn’t know her story.',
    bio: 'Shresta Iyer works across digital content and reality entertainment, two spaces where personality becomes part of the public conversation. Her introduction goes beyond what appears in a feed or on a screen. At AntiSocialTalks, the focus turns to the person behind the content, with room for conversations about creativity, visibility and individuality. It is a chance to discover more than a carefully selected moment.',
  },
  {
    name: 'Mahsad Ziaee',
    designation: 'Actor | Reality Show Artist',
    teaser: 'A screen can show you someone. It can’t explain them.',
    bio: 'Mahsad Ziaee is an actor and reality show artist whose work places her in front of audiences through different forms of entertainment. Acting introduces a character; reality television invites viewers to form opinions about a person. AntiSocialTalks offers another setting, one where conversation can extend beyond the screen. Her appearance opens space to explore identity, public perception and the experiences that a brief scene cannot capture.',
  },
  {
    name: 'Mahbod Mahmoudi Aznaveh',
    designation: 'Musician | Reality Show Artist',
    teaser: 'You can judge the sound. You don’t know the whole story.',
    bio: 'Mahbod Mahmoudi Aznaveh works across music and reality entertainment, bringing both creative expression and an on-screen presence to his introduction. Music offers one way to communicate; conversation offers another. On AntiSocialTalks, the attention shifts from the performance to the person behind it. His appearance creates room to explore creativity, identity and the relationship between how someone expresses themselves and how audiences interpret them.',
  },
  {
    name: 'Reem Elkott',
    designation: 'Digital Creator | Influencer',
    teaser: 'A follow is easy. Understanding takes longer.',
    bio: 'Reem Elkott is a digital creator and influencer working in a space where stories, images and everyday moments shape public perception. Her online presence is one part of her introduction, rather than its final word. AntiSocialTalks makes room for a longer conversation about creativity, visibility and the person behind the profile. Here, attention moves from what audiences can scroll through to what they can understand by listening.',
  },
  {
    name: 'Alaa Sediik',
    designation: 'Lifestyle Influencer | Speaker',
    teaser: 'An opinion doesn’t need your permission.',
    bio: 'Alaa Sediik brings together lifestyle content and speaking, connecting visual storytelling with spoken expression. These roles provide different ways to share a perspective and engage an audience. Her AntiSocialTalks appearance offers space to explore the thoughts and experiences behind that public presence. Beyond a post or a short clip, the conversation invites audiences to consider individuality, self-expression and the assumptions they bring to someone’s story.',
  },
  {
    name: 'Marjan Khodadad',
    designation: 'Fashion Designer',
    teaser: 'An outfit is not an invitation to judge.',
    bio: 'Marjan Khodadad is a fashion designer working in a field where clothing becomes a form of expression. Her professional introduction begins with design, but the conversation can reach beyond appearance. At AntiSocialTalks, she joins a space for exploring creativity, personal identity and the meanings people attach to what they wear. It is an invitation to look beyond the finished outfit and listen to the person behind the work.',
  },
  {
    name: 'Gauri G',
    formerNames: ['Gauri Singh'],
    designation: 'Dancer | Actor | Reality Show Artist',
    teaser: 'She can play a role. You don’t get to assign her one.',
    bio: 'Gauri G works across dance, acting and reality entertainment, bringing several forms of performance to her creative identity. Movement, character and on-screen presence each reveal a different part of that work. AntiSocialTalks offers room to step beyond performance and into conversation. Her appearance invites audiences to explore the person behind those roles and consider what visibility reveals and what still deserves to be heard in her own words.',
  },
  {
    name: 'Sunny Kalra',
    designation: 'Actor | Dubai Luxury Property Specialist',
    teaser: 'Success looks polished. The story rarely is.',
    bio: 'Sunny Kalra works across acting and Dubai’s luxury property sector, combining a creative profession with a client-facing business role. His introduction spans two distinct worlds, each with its own expectations and public image. On AntiSocialTalks, the conversation extends beyond professional presentation to the person behind it. His appearance creates space to explore ambition, identity and how different roles shape the way people see and understand someone.',
  },
  {
    name: 'Dr. Anmol Kapoor',
    designation: 'Founder & Chairman, Kapoor Wealth Partners',
    teaser: 'If everyone agrees, someone isn’t saying what they really think.',
    bio: 'Dr. Anmol Kapoor is the Founder and Chairman of Kapoor Wealth Partners and one of the voices of AntiSocialTalks. His introduction begins with business leadership, but extends beyond a professional title. Here, he joins a space where perspectives can be explored, assumptions questioned and difficult subjects discussed openly. The conversation invites audiences to discover the person behind the designation and hear his thinking in his own words.',
  },
];

if (!EMAIL || !PASSWORD) {
  console.error('\n  Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD (the admin login).\n');
  process.exit(1);
}

let token = '';

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path}: ${json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return json?.data;
}

const q = (o) => encodeURIComponent(JSON.stringify(o));

console.log(`\n  Voices update for ${BASE}\n`);

try {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${lj?.errors?.[0]?.message || login.status}`);
  token = lj.data.access_token;

  // guests.teaser arrives with content-update-2026-10-05.mjs; fail clearly if it hasn't run.
  try {
    await api('/fields/guests/teaser');
  } catch {
    throw new Error('guests.teaser does not exist yet — run scripts/migrations/content-update-2026-10-05.mjs first.');
  }

  let missing = 0;
  for (const voice of VOICES) {
    const names = [voice.name, ...(voice.formerNames || [])];
    const row = (await api(`/items/guests?filter=${q({ name: { _in: names } })}&fields=id,name&limit=1`))?.[0];
    if (!row) {
      console.log(`  ! not found: ${voice.name}`);
      missing++;
      continue;
    }
    const { formerNames, ...fields } = voice;
    await api(`/items/guests/${row.id}`, { method: 'PATCH', body: fields });
    const renamed = row.name !== voice.name ? `  (renamed from "${row.name}")` : '';
    console.log(`  + ${voice.name.padEnd(24)} ${voice.designation}${renamed}`);
  }

  console.log(`\n  Done${missing ? ` — ${missing} not found, check the names in Directus` : ''}.\n`);
} catch (err) {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exit(1);
}
