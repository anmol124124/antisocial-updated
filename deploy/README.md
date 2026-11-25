# Deploying AntiSocialTalks to the VPS

Puts the Next.js site and Directus on **staging** first. The live
`antisocialtalks.com` static site is not touched anywhere in this document —
staging is a separate directory, a separate pm2 app and a separate nginx server
block. Promoting to production is a short appendix at the end.

**Target:** the VPS (Ubuntu, Node 22, pm2, nginx + certbot). Its addresses and SSH
login are in the team's private ops notes, not in this repository; below they are
written as `<ssh-user>@<server-private-ip>` and `<server-public-ip>`.

- **SSH to it as `<ssh-user>@<server-private-ip>`** — its private address. `<server-hostname>` is only the
  hostname shown in the shell prompt; it is not an SSH alias, so
  `ssh <ssh-user>@<server-hostname>` will not resolve from the Windows machine.
- **Public IP `<server-public-ip>`** — what DNS points at, and what Let's Encrypt and
  visitors connect to.

| Service | Runs as | Port | URL |
| --- | --- | --- | --- |
| Next.js site | pm2 app `stage.antisocialtalks.com` | 3012 | https://stage.antisocialtalks.com |
| Directus CMS | Docker Compose | 127.0.0.1:8055 | https://cms-stage.antisocialtalks.com |

Port 3012 because 3000–3010 are taken by other pm2 apps on this box.

**Staging is not indexable.** Only a site with `SITE_INDEXABLE=true` in its
`.env.local` may be indexed; everything else serves `Disallow: /` in robots.txt
and a `noindex, nofollow` meta tag on every page, and the staging nginx config
adds an `X-Robots-Tag` header on top. Set it to `true` on production only.

## Upgrading a running site to the restructured code (`feature/code-restructure`)

For a CMS and site that are already up. Nothing is deleted from the CMS.

1. **Back up the CMS database** (see `cms/README.md` → Backups).
2. **CMS folder on the server:** upload `cms/schema`, `cms/seed`, `cms/scripts` and
   `cms/docker-compose.yml` into it. Keep its `.env`.
3. **Directus version:** the compose file now pins `11.17.4`. Check what runs
   (`cms/README.md` → Updating); if it is older, `sudo docker compose pull && sudo docker compose up -d`.
4. **Provision** (A6 below): `node scripts/provision.mjs --dry-run`, read the list, then
   without `--dry-run`. It adds the new collections (site settings, home page, About values,
   community forms, Roadshow, Chapters guide), the website's read rules for them, and
   their starting content with the pictures and teaser clip.
5. **Site** (B1–B5): upload `web/`, then in its `.env.local` add `SITE_INDEXABLE=true` on
   **production only** (staging: `false`); drop `GELATO_STORE_ID` / `GELATO_WEBHOOK_SECRET`
   (unused). `npm ci && npm run build && pm2 restart <app>`.
6. **Check:** home page pictures, topics and social links; a form sends; `/robots.txt`
   allows indexing on production only.

**Do Part A before Part B.** The site reads all content from the CMS, so a site
deployed against an empty CMS renders empty sections.

---

## Part A — Directus at cms-stage.antisocialtalks.com

### A1. DNS

Checked 2026-09-28:

- `stage.antisocialtalks.com` **already exists**, proxied (orange), and already
  points at the VPS — it currently serves the old static `index.html`. Nothing
  to create, but see the grey-cloud note below.
- `cms-stage.antisocialtalks.com` does **not** exist yet.

In Cloudflare:

1. Add the CMS record:
   ```
   Type: A   Name: cms-stage   IPv4: <server-public-ip>   Proxy: DNS only (grey cloud)
   ```
2. Temporarily set the existing `stage` record to **DNS only (grey cloud)** too.

Both stay grey until their certificates exist. Certbot's HTTP challenge is much
less fussy without the proxy in front, and it has already failed once on this
box. Orange cloud goes back on in A5 and B7.

> The hyphen in `cms-stage` is deliberate. Cloudflare's free Universal SSL
> covers `*.antisocialtalks.com` but **not** a two-level name like
> `cms.stage.antisocialtalks.com`, which would need Advanced Certificate
> Manager. One level keeps it free and proxied.

Verify from Windows PowerShell (`dig` is a Linux/macOS tool — it does not exist
on Windows; the equivalent is `Resolve-DnsName`):

```powershell
Resolve-DnsName stage.antisocialtalks.com     -Server 1.1.1.1 -Type A
Resolve-DnsName cms-stage.antisocialtalks.com -Server 1.1.1.1 -Type A
```

While grey-clouded both must show `<server-public-ip>`. If you still see Cloudflare
addresses (`104.21.*`, `172.67.*`) the record is still proxied, or the change
has not propagated yet — wait a minute and re-run.

### A2. Docker

```bash
docker --version
```

If that errors:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### A3. Upload and start Directus

From Windows PowerShell:

```powershell
cd "C:\Users\admin\Downloads\latest code\antisocialtalks\cms"
ssh <ssh-user>@<server-private-ip> "mkdir -p /home/ubuntu/antisocialtalks-cms-stage"
scp -r docker-compose.yml .env.example schema seed scripts nginx <ssh-user>@<server-private-ip>:/home/ubuntu/antisocialtalks-cms-stage/
```

> Upload `docker-compose.yml`, **not** `docker-compose.local.yml` — that one has
> throwaway passwords and exposes 8055 to the whole machine.

On the VPS:

```bash
cd /home/ubuntu/antisocialtalks-cms-stage
cp .env.example .env
openssl rand -hex 32    # -> DIRECTUS_KEY
openssl rand -hex 32    # -> DIRECTUS_SECRET
nano .env
```

Fill in `DIRECTUS_KEY`, `DIRECTUS_SECRET`, `DB_PASSWORD`, `ADMIN_PASSWORD`. The
`PUBLIC_URL` and `CORS_ORIGIN` lines already default to the staging values —
leave them. Leave `SMTP_*` blank; Directus runs fine without email.

```bash
sudo docker compose up -d
sudo docker compose logs -f directus      # wait for "Server started", Ctrl-C
curl -s localhost:8055/server/ping        # expect: pong
```

### A4. nginx

```bash
sudo cp /home/ubuntu/antisocialtalks-cms-stage/nginx/cms-stage.antisocialtalks.com.conf \
        /etc/nginx/sites-available/cms-stage.antisocialtalks.com
sudo ln -s /etc/nginx/sites-available/cms-stage.antisocialtalks.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -s -H "Host: cms-stage.antisocialtalks.com" localhost/server/ping   # expect: pong
```

### A5. HTTPS

```bash
sudo certbot --nginx -d cms-stage.antisocialtalks.com
```

Then in Cloudflare flip `cms-stage` back to **Proxied (orange)**, and confirm
SSL/TLS mode is **Full (strict)**.

Open <https://cms-stage.antisocialtalks.com> and log in with `ADMIN_EMAIL` /
`ADMIN_PASSWORD` from `.env`.

### A6. Schema, permissions and starting content

On the VPS, in the CMS folder (the admin login is read from its `.env`):

```bash
cd /home/ubuntu/antisocialtalks-cms-stage
export DIRECTUS_URL=http://127.0.0.1:8055
export DIRECTUS_EMAIL=$(grep ^ADMIN_EMAIL= .env | cut -d= -f2)
export DIRECTUS_PASSWORD=$(grep ^ADMIN_PASSWORD= .env | cut -d= -f2)
node scripts/provision.mjs --dry-run     # read what it will do
node scripts/provision.mjs
```

Creates every collection the site uses (`schema/snapshot.json`), the website's
permissions (`schema/website-policy.json`) and the starting site settings and
page copy (`seed/`). Safe to re-run: it never deletes, and only fills empty
collections. Details: `cms/README.md`.

### A7. The website's access token

The site talks to Directus with its own token. That token's policy can **read**
the content collections and files, and **create** submissions — nothing else.
Nothing in the CMS is made public.

> Do **not** use the Public policy for the forms. Requests that carry a token
> never receive Public permissions in Directus, so "Public: create on
> submissions" silently does nothing for this site and every form returns 403.

Run on the VPS, in the CMS folder, with the same three variables as A6:

```bash
cd /home/ubuntu/antisocialtalks-cms-stage
export DIRECTUS_URL=http://127.0.0.1:8055
export DIRECTUS_EMAIL=$(grep ^ADMIN_EMAIL= .env | cut -d= -f2)
export DIRECTUS_PASSWORD=$(grep ^ADMIN_PASSWORD= .env | cut -d= -f2)
node scripts/create-site-token.mjs /home/ubuntu/antisocialtalks-cms-stage/.site-token
```

It creates the policy, a `website@antisocialtalks.com` user and a static token,
then proves the token can read content and files and create a submission, and
**cannot** read submissions back or create content. The token is written to
`.site-token` (mode 600) for B2 to pick up. Safe to re-run; it rotates the token.

---

## Part B — the site at stage.antisocialtalks.com

### B1. Upload (without node_modules)

Never copy `node_modules` from Windows to Linux — the native binaries inside are
built for the wrong platform. `.next` is rebuilt on the server, and `.env.local`
is local-only.

```powershell
cd "C:\Users\admin\Downloads\latest code\antisocialtalks"
tar -czf web.tar.gz --exclude=node_modules --exclude=.next --exclude=.env.local web
scp web.tar.gz <ssh-user>@<server-private-ip>:/home/ubuntu/
```

(A few MB: the pictures and the teaser clip now live in the CMS.)

On the VPS:

```bash
cd /home/ubuntu
tar -xzf web.tar.gz
sudo rm -rf /var/www/stage.antisocialtalks.com
sudo mv web /var/www/stage.antisocialtalks.com
```

```bash
sudo chown -R ubuntu:ubuntu /var/www/stage.antisocialtalks.com
```

> Run that `chown` as its own command, on its own line. Pasted inside a
> multi-line block the sudo password prompt gets swallowed and the chown
> silently never happens — it resurfaces much later as a confusing `EACCES`.

The directory name is not cosmetic: `ecosystem.config.cjs` takes the pm2 app
name from it, so this becomes the pm2 app `stage.antisocialtalks.com`.

### B2. Environment file

`NEXT_PUBLIC_*` values are compiled into the bundle, so this must exist
**before** the build.

```bash
cd /var/www/stage.antisocialtalks.com
cp .env.stage.example .env.local
nano .env.local
```

Set:

```ini
NEXT_PUBLIC_SITE_URL=https://stage.antisocialtalks.com
SITE_INDEXABLE=false
DIRECTUS_URL=http://127.0.0.1:8055
NEXT_PUBLIC_DIRECTUS_URL=https://cms-stage.antisocialtalks.com
DIRECTUS_TOKEN=<the website token from A7>
GELATO_API_KEY=<your Gelato key>
PAYMENT_GATEWAY=none
```

`DIRECTUS_URL` stays on `127.0.0.1`: Next and Directus are on the same machine,
so there is no reason to go out to Cloudflare and back for every content read.

### B3. Install and build

```bash
cd /var/www/stage.antisocialtalks.com
npm install
npm run build
```

`npm install` without `--omit=dev` — TypeScript and Tailwind are
devDependencies and the build needs them.

Check the Gelato key while you are here:

```bash
npm run verify:gelato
```

### B4. Smoke-test on the port, before touching nginx

```bash
npx next start -p 3012 &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" localhost:3012/
curl -s localhost:3012/robots.txt
curl -s localhost:3012/ | grep -c "AntiSocial"
curl -s localhost:3012/guests | grep -c "Marjan"
kill %1
```

Expect `200`, a robots.txt saying `Disallow: /`, and non-zero counts. If pages
render but every section is empty, the CMS link is wrong — check
`DIRECTUS_TOKEN`, that `curl localhost:8055/server/ping` answers, and the Next
output for `[directus]` warnings.

### B5. Start it under pm2

```bash
cd /var/www/stage.antisocialtalks.com
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs stage.antisocialtalks.com --lines 30
```

The config calls `node_modules/next/dist/bin/next` directly rather than
`npm start`. pm2 wrapping a package-manager script is the most common way these
deploys break.

### B6. nginx

```powershell
cd "C:\Users\admin\Downloads\latest code\antisocialtalks\deploy\nginx"
scp stage.antisocialtalks.com.conf <ssh-user>@<server-private-ip>:/home/ubuntu/
```

```bash
sudo cp /home/ubuntu/stage.antisocialtalks.com.conf \
        /etc/nginx/sites-available/stage.antisocialtalks.com
sudo ln -s /etc/nginx/sites-available/stage.antisocialtalks.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: stage.antisocialtalks.com" localhost/
```

This adds a new server block. It does not touch the existing
`antisocialtalks.com` one.

### B7. HTTPS

```bash
sudo certbot --nginx -d stage.antisocialtalks.com
```

Then flip `stage` back to **Proxied (orange)** in Cloudflare.

### B8. Check it

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://stage.antisocialtalks.com/
curl -s https://stage.antisocialtalks.com/robots.txt
```

`robots.txt` must say `Disallow: /`. In a browser walk through home, episodes,
guests, shop — then submit one community form and confirm the row appears in
Directus under `submissions`.

Also confirm the live site is still fine: <https://www.antisocialtalks.com>.

---

## Shipping a later update to staging

```powershell
cd "C:\Users\admin\Downloads\latest code\antisocialtalks"
tar -czf web.tar.gz --exclude=node_modules --exclude=.next --exclude=.env.local web
scp web.tar.gz <ssh-user>@<server-private-ip>:/home/ubuntu/
```

```bash
cd /home/ubuntu && tar -xzf web.tar.gz
rm -rf /var/www/stage.antisocialtalks.com-new
sudo mv web /var/www/stage.antisocialtalks.com-new
sudo chown -R ubuntu:ubuntu /var/www/stage.antisocialtalks.com-new
cp /var/www/stage.antisocialtalks.com/.env.local /var/www/stage.antisocialtalks.com-new/.env.local
cd /var/www/stage.antisocialtalks.com-new && npm install && npm run build
```

Then swap and restart:

```bash
pm2 stop stage.antisocialtalks.com
sudo rm -rf /var/www/stage.antisocialtalks.com-old
sudo mv /var/www/stage.antisocialtalks.com /var/www/stage.antisocialtalks.com-old
sudo mv /var/www/stage.antisocialtalks.com-new /var/www/stage.antisocialtalks.com
```

```bash
sudo chown -R ubuntu:ubuntu /var/www/stage.antisocialtalks.com
```

```bash
cd /var/www/stage.antisocialtalks.com && pm2 restart stage.antisocialtalks.com && pm2 save
```

Content changes need none of this — those are Directus edits, live within a
minute.

---

## Appendix — promoting to production later

Staging and production run the same code and the same compose file; they differ
only in names, ports and env values.

1. **Back up the live static site first** — it is your rollback:
   ```bash
   sudo cp -r /var/www/antisocialtalks.com /var/www/antisocialtalks.com-static-backup
   sudo cp /etc/nginx/sites-available/antisocialtalks.com \
           /etc/nginx/sites-available/antisocialtalks.com.static.bak
   ```
2. **A second Directus** in `/home/ubuntu/antisocialtalks-cms`, same
   `docker-compose.yml`, its own `.env` with production `PUBLIC_URL` and
   `CORS_ORIGIN` (both shown in `.env.example`), and a different host port if
   you keep staging running — change the `ports:` line to `127.0.0.1:8056:8055`
   and point production's `DIRECTUS_URL` at `127.0.0.1:8056`.
3. **The site** into `/var/www/antisocialtalks.com`, using
   `.env.production.example` and a different pm2 port
   (`PORT=3013 pm2 start ecosystem.config.cjs`). The pm2 app name comes from
   the directory, so it will be `antisocialtalks.com` automatically.
4. **nginx**: `deploy/nginx/antisocialtalks.com.conf`, adjusting the
   `proxy_pass` port to match. Keep certbot's existing 443 block if there is
   one and replace only the `location` directives inside it.
5. Set `NEXT_PUBLIC_SITE_URL=https://antisocialtalks.com` and
   `SITE_INDEXABLE=true` (then rebuild): that switches robots.txt and the meta
   tag to indexable. Without it the live site tells search engines to stay away.
6. Purge the Cloudflare cache so nobody is served the old static page.

Rollback, if needed:

```bash
pm2 stop antisocialtalks.com
sudo rm -rf /var/www/antisocialtalks.com
sudo mv /var/www/antisocialtalks.com-static-backup /var/www/antisocialtalks.com
sudo cp /etc/nginx/sites-available/antisocialtalks.com.static.bak \
        /etc/nginx/sites-available/antisocialtalks.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## When something is wrong

| Symptom | Cause |
| --- | --- |
| 502 from nginx | pm2 app is down — `pm2 logs stage.antisocialtalks.com` |
| Pages render, every section empty | `DIRECTUS_TOKEN` missing or unauthorised, or Directus down. Check `curl localhost:8055/server/ping` and the Next log for `[directus]` warnings |
| Images 404 | The website policy needs **Read** on `directus_files`: run `cms/scripts/provision.mjs` |
| Forms return an error | The website policy needs **Create** on `submissions`: run `cms/scripts/provision.mjs`. Public-policy permissions do not apply to token requests |
| "Too many attempts" on a form | The per-visitor limit (`web/src/lib/rate-limit.ts`, 10 per 10 minutes); it resets by itself |
| Home page without pictures, topics or social links | The new CMS collections are empty or missing: run `cms/scripts/provision.mjs` |
| Shop says Gelato not connected | `GELATO_API_KEY` missing — `npm run verify:gelato` |
| Checkout returns 501 | `PAYMENT_GATEWAY` is `none` (shop closed) or the Stripe keys are missing |
| `EACCES` in pm2 logs | The `chown` did not run. Run it on its own line |
| certbot: "could not find a matching server block" | The nginx file is not symlinked into `sites-enabled`, or `server_name` does not match the domain exactly |
| pm2 app named `web` or `...-new` | You started pm2 before the directory had its final name. `pm2 delete` it, `cd` into the correct directory, start again |
