# AntiSocialTalks CMS (Directus)

Self-hosted admin panel for the team: add guests, flip an episode from
"Coming Soon" to "Published", paste the YouTube link, manage host
profiles, add chapter events, and review community-form submissions —
all without asking a developer, and nothing goes live until someone
with access approves it (Directus's own draft/published fields handle
that).

## What this is (and isn't) yet

- **Is**: Directus itself, deployed and running, with the 5 collections
  the website needs already created (`hosts`, `episodes`, `guests`,
  `chapters`, `submissions`).
- **Isn't yet**: the actual website pages that *read* from this data
  (Episodes directory, guest profile pages, Dubai chapter page) and the
  5 community forms that *write* to it. Those come next, once this is
  confirmed running — see "Next" at the bottom.

## 1. Deploy Directus on the VPS

Requires Docker. Check first:

```bash
docker --version
```

If that errors, install it:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

Upload this folder (from your PC, PowerShell):

```powershell
cd "C:\Users\admin\Downloads\latest code\antisocialtalks\cms"
scp -r docker-compose.yml .env.example provision-schema.js cms.antisocialtalks.com.nginx ubuntu@10.90.30.84:/home/ubuntu/antisocialtalks-cms/
```

On the VPS:

```bash
cd /home/ubuntu/antisocialtalks-cms
cp .env.example .env
```

Edit `.env` and fill in every value (never upload a real `.env` from
Windows — same rule as the backend project). Generate the two secrets:

```bash
openssl rand -hex 32   # -> DIRECTUS_KEY
openssl rand -hex 32   # -> DIRECTUS_SECRET
```

Start it:

```bash
sudo docker compose up -d
sudo docker compose logs -f directus   # watch until it says "Server started"
```

## 2. Nginx + HTTPS

```bash
sudo mv cms.antisocialtalks.com.nginx /etc/nginx/sites-available/cms.antisocialtalks.com
sudo ln -s /etc/nginx/sites-available/cms.antisocialtalks.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Add a Cloudflare DNS record first: `A cms 158.51.50.44` (proxied), then:

```bash
sudo certbot --nginx -d cms.antisocialtalks.com
```

If certbot says "could not find a matching server block" (it did once
before on this VPS, for antisocialtalks.com itself), tell Claude and
it'll write the 443 block by hand the same way it did last time.

Once that's done, `https://cms.antisocialtalks.com` should show the
Directus login screen. Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD`
from `.env`.

## 3. Create the collections

From your PC (or the VPS — anywhere with Node):

```bash
cd antisocialtalks/cms
DIRECTUS_URL=https://cms.antisocialtalks.com \
DIRECTUS_EMAIL=gurpreet@kapoorwealth.com \
DIRECTUS_PASSWORD='the ADMIN_PASSWORD you set' \
node provision-schema.js
```

This creates `hosts`, `episodes`, `guests`, `chapters`, `submissions`
with all their fields. Safe to re-run.

## 4. Two one-time clicks in the Directus dashboard

**Let the public website submit forms**, without letting the public
read or edit anything else:
1. Settings -> Access Policies -> **Public**.
2. Under Permissions, find **submissions** and enable **Create** only.
   Leave Read/Update/Delete off.

**Email notification on every new submission** (needs SMTP filled in
`.env` first — Gmail with an app password, or a transactional sender
like Resend/SendGrid work fine):
1. Settings -> Flows -> **Create Flow**.
2. Trigger: **Event Hook**, type `action`, scope `items.create`,
   collection `submissions`.
3. Operation: **Send Email** -> To: `gurpreet@kapoorwealth.com`,
   Subject: `New AntiSocialTalks submission: {{$trigger.payload.type}}`,
   Body: include `{{$trigger.payload.name}}`, `{{$trigger.payload.email}}`,
   `{{$trigger.payload.message}}`.

Submissions land in the Directus dashboard immediately either way —
the email is a convenience notification on top, not the only place
they're recorded.

## Next (not built yet)

1. Wire the website's guest grid and Featured Episode section to read
   from `guests` / `episodes` instead of hardcoded HTML, so the
   "Coming Soon" -> "Watch Episode" swap and new guest cards are a
   Directus edit, not a code change.
2. Build the 5 forms (Share Your Story, Submit a Question, Suggest a
   Speaker, Join the Community, Partner With Us) as real `<form>`s that
   POST to `https://cms.antisocialtalks.com/items/submissions`, with a
   confirmation message and an email-consent checkbox.
3. Build the Episodes directory (browse by guest/host/topic) and host
   profile pages.
4. Build the Chapters section and the Dubai template, reading from
   `chapters`.
