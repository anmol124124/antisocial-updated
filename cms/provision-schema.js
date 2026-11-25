// One-time setup script: creates the 5 collections AntiSocialTalks needs
// (hosts, guests, episodes, chapters, submissions) in a fresh Directus
// instance, with all their fields and relations.
//
// Run this ONCE, right after Directus is up and you've logged in as admin
// for the first time. Safe to re-run — it skips any collection that
// already exists instead of erroring.
//
// Usage:
//   DIRECTUS_URL=https://cms.antisocialtalks.com \
//   DIRECTUS_EMAIL=gurpreet@kapoorwealth.com \
//   DIRECTUS_PASSWORD='your-admin-password' \
//   node provision-schema.js

const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';
const EMAIL = process.env.DIRECTUS_EMAIL;
const PASSWORD = process.env.DIRECTUS_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD env vars first.');
  process.exit(1);
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return data.access_token;
}

async function collectionExists(token, name) {
  const res = await fetch(`${BASE}/collections/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

async function createCollection(token, body) {
  if (await collectionExists(token, body.collection)) {
    console.log(`- ${body.collection}: already exists, skipping`);
    return;
  }
  const res = await fetch(`${BASE}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create ${body.collection} failed: ${res.status} ${await res.text()}`);
  console.log(`- ${body.collection}: created`);
}

// Shared field shapes -------------------------------------------------

const statusField = (choices, defaultValue) => ({
  field: 'status',
  type: 'string',
  meta: {
    interface: 'select-dropdown',
    options: { choices: choices.map((c) => ({ text: c[0], value: c[1] })) },
    display: 'labels',
    width: 'half',
  },
  schema: { default_value: defaultValue },
});

const textField = (field, opts = {}) => ({
  field,
  type: 'string',
  meta: { interface: 'input', width: 'full', ...opts },
});

const longTextField = (field) => ({
  field,
  type: 'text',
  meta: { interface: 'input-multiline', width: 'full' },
});

const boolField = (field, defaultValue = false) => ({
  field,
  type: 'boolean',
  meta: { interface: 'boolean', width: 'half' },
  schema: { default_value: defaultValue },
});

const imageField = (field) => ({
  field,
  type: 'uuid',
  meta: { interface: 'file-image', special: ['file'], width: 'half' },
});

const dateTimeField = (field) => ({
  field,
  type: 'timestamp',
  meta: { interface: 'datetime', width: 'half' },
});

const m2oField = (field, relatedCollection) => ({
  field,
  type: 'integer',
  meta: { interface: 'select-dropdown-m2o', special: ['m2o'], width: 'half' },
  schema: {},
  // relation created separately below via /relations, kept here only as
  // a plain FK column; Directus infers the M2O once the relation exists.
});

async function createRelation(token, body) {
  const res = await fetch(`${BASE}/relations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 400) {
    console.warn(`  (relation ${body.collection}.${body.field} -> ${body.related_collection}: ${res.status} ${await res.text()})`);
  }
}

async function main() {
  console.log(`Provisioning schema on ${BASE} ...`);
  const token = await login();

  await createCollection(token, {
    collection: 'hosts',
    meta: { icon: 'mic', note: 'The 5 AntiSocialTalks hosts.' },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      textField('name'),
      imageField('photo'),
      longTextField('bio'),
      textField('instagram_url'),
      statusField([['Draft', 'draft'], ['Published', 'published']], 'draft'),
    ],
  });

  await createCollection(token, {
    collection: 'episodes',
    meta: { icon: 'movie', note: 'Podcast episodes — status drives the "Coming Soon" / "Watch Episode" swap on the website.' },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      textField('title'),
      longTextField('description'),
      textField('youtube_url'),
      statusField([['Coming Soon', 'coming_soon'], ['Published', 'published']], 'coming_soon'),
      dateTimeField('publish_date'),
      textField('topics'),
      m2oField('host', 'hosts'),
    ],
  });
  await createRelation(token, { collection: 'episodes', field: 'host', related_collection: 'hosts' });
  // Image fields need a relation to directus_files, or the CMS uploads the
  // file to the library and then cannot save it on the item.
  await createRelation(token, { collection: 'hosts', field: 'photo', related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } });

  await createCollection(token, {
    collection: 'guests',
    meta: { icon: 'groups', note: 'Guest profile cards shown in the Meet Our Guests grid.' },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      textField('name'),
      textField('designation'),
      imageField('photo'),
      longTextField('bio'),
      textField('instagram_url'),
      textField('paired_with_label', { note: 'e.g. "Iranian couple" or "Egyptian friends" — used to visually group two guest cards together.' }),
      m2oField('host', 'hosts'),
      m2oField('episode', 'episodes'),
      statusField([['Draft', 'draft'], ['Published', 'published']], 'draft'),
    ],
  });
  await createRelation(token, { collection: 'guests', field: 'host', related_collection: 'hosts' });
  await createRelation(token, { collection: 'guests', field: 'episode', related_collection: 'episodes' });
  await createRelation(token, { collection: 'guests', field: 'photo', related_collection: 'directus_files', schema: { on_delete: 'SET NULL' } });

  await createCollection(token, {
    collection: 'chapters',
    meta: { icon: 'location_city', note: 'City chapters (Dubai first). Keep status=coming_soon until a real event is approved.' },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      textField('city'),
      textField('slug', { note: 'URL-safe, e.g. "dubai"' }),
      textField('theme'),
      textField('venue'),
      dateTimeField('event_date'),
      statusField([['Coming Soon', 'coming_soon'], ['Announced', 'announced'], ['Published', 'published']], 'coming_soon'),
      textField('registration_url'),
      longTextField('team'),
      longTextField('schedule'),
      longTextField('partners'),
      longTextField('past_talks'),
    ],
  });

  await createCollection(token, {
    collection: 'submissions',
    meta: { icon: 'inbox', note: 'Everything coming in from the website forms: Share Your Story, Submit a Question, Suggest a Speaker, Join the Community, Partner With Us.' },
    schema: {},
    fields: [
      { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
      {
        field: 'type',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          width: 'half',
          options: {
            choices: [
              { text: 'Share Your Story', value: 'story' },
              { text: 'Submit a Question', value: 'question' },
              { text: 'Suggest a Speaker', value: 'speaker' },
              { text: 'Join the Community', value: 'community' },
              { text: 'Partner With Us', value: 'partner' },
            ],
          },
        },
      },
      textField('name'),
      textField('email'),
      longTextField('message'),
      {
        field: 'interest',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          width: 'half',
          note: 'Only meaningful for "Share Your Story" submissions.',
          options: {
            choices: [
              { text: 'Podcast', value: 'podcast' },
              { text: 'Live chapter talk', value: 'chapter' },
              { text: 'Both', value: 'both' },
            ],
          },
        },
      },
      boolField('consent_email', false),
      boolField('reviewed', false),
    ],
  });

  console.log('\nDone. Next steps (see cms/README.md):');
  console.log('1. Settings -> Access Policies -> Public: allow "create" on submissions.');
  console.log('2. Settings -> Flows: add the "new submission -> email" automation.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
