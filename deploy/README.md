# Deploying AntiSocialTalks to the VPS

Puts the Next.js site and Directus on **staging** first. The live
`antisocialtalks.com` static site is not touched anywhere in this document —
staging is a separate directory, a separate pm2 app and a separate nginx server
block. Promoting to production is a short appendix at the end.

**Target:** the VPS whose hostname is `wbsnj` (Ubuntu, Node 22, pm2, nginx + certbot).

- **SSH to it as `ubuntu@10.90.30.84`** — its private address. `wbsnj` is only the
  hostname shown in the shell prompt; it is not an SSH alias, so
  `ssh ubuntu@wbsnj` will not resolve from the Windows machine.
- **Public IP `158.51.50.44`** — what DNS points at, and what Let's Encrypt and
  visitors connect to.

| Service | Runs as | Port | URL |
| --- | --- | --- | --- |
| Next.js site | pm2 app `stage.antisocialtalks.com` | 3012 | https://stage.antisocialtalks.com |
| Directus CMS | Docker Compose | 127.0.0.1:8055 | https://cms-stage.antisocialtalks.com |

Port 3012 because 3000–3010 are taken by other pm2 apps on this box.

**Staging is not indexable.** Anything whose `NEXT_PUBLIC_SITE_URL` is not
`antisocialtalks.com` serves `Disallow: /` in robots.txt and a `noindex,
nofollow` meta tag on every page, and the nginx config adds an `X-Robots-Tag`
header on top. Nothing to remember — it follows the env var.

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
   Type: A   Name: cms-stage   IPv4: 158.51.50.44   Proxy: DNS only (grey cloud)
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

While grey-clouded both must show `158.51.50.44`. If you still see Cloudflare
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
ssh ubuntu@10.90.30.84 "mkdir -p /home/ubuntu/antisocialtalks-cms-stage"
scp docker-compose.yml .env.example provision-schema.js cms-stage.antisocialtalks.com.nginx ubuntu@10.90.30.84:/home/ubuntu/antisocialtalks-cms-stage/
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
sudo mv /home/ubuntu/antisocialtalks-cms-stage/cms-stage.antisocialtalks.com.nginx \
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

### A6. Create the collections and seed content

From Windows PowerShell:

```powershell
cd "C:\Users\admin\Downloads\latest code\antisocialtalks\cms"
$env:DIRECTUS_URL="https://cms-stage.antisocialtalks.com"
$env:DIRECTUS_EMAIL="the ADMIN_EMAIL you set"
$env:DIRECTUS_PASSWORD="the ADMIN_PASSWORD you set"
node provision-schema.js
```

Creates `hosts`, `episodes`, `guests`, `chapters`, `submissions`. Then the two
collections the website adds, plus starter content (7 topics, 6 guests, the
coming-soon episode, the Dubai chapter) — same PowerShell session, so the env
vars carry over:

```powershell
cd ..\web
npm run seed
```

Both are safe to re-run; they only create what is missing.

### A7. The website's access token

The site talks to Directus with its own token. That token's policy can **read**
the content collections and files, and **create** submissions — nothing else.
Nothing in the CMS is made public.

> Do **not** use the Public policy for the forms. Requests that carry a token
> never receive Public permissions in Directus, so "Public: create on
> submissions" silently does nothing for this site and every form returns 403.

Run on the VPS once Part B1 has put the site files in place (the script ships
with them). The admin credentials are read from the CMS `.env`:

```bash
cd /home/ubuntu/antisocialtalks-cms-stage
export DIRECTUS_URL=http://127.0.0.1:8055
export DIRECTUS_EMAIL=$(grep ^ADMIN_EMAIL= .env | cut -d= -f2)
export DIRECTUS_PASSWORD=$(grep ^ADMIN_PASSWORD= .env | cut -d= -f2)
node /var/www/stage.antisocialtalks.com/../cms/scripts/create-site-token.mjs \
     /home/ubuntu/antisocialtalks-cms-stage/.site-token
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
scp web.tar.gz ubuntu@10.90.30.84:/home/ubuntu/
```

(~41 MB, mostly the teaser video.)

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
DIRECTUS_URL=http://127.0.0.1:8055
NEXT_PUBLIC_DIRECTUS_URL=https://cms-stage.antisocialtalks.com
DIRECTUS_TOKEN=<the read-only token from A7>
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
cd "C:\Users\admin\Downloads\latest code\antisocialtalks\deploy"
scp stage.antisocialtalks.com.nginx ubuntu@10.90.30.84:/home/ubuntu/
```

```bash
sudo cp /home/ubuntu/stage.antisocialtalks.com.nginx \
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
scp web.tar.gz ubuntu@10.90.30.84:/home/ubuntu/
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
4. **nginx**: `deploy/antisocialtalks.com.nextjs.nginx`, adjusting the
   `proxy_pass` port to match. Keep certbot's existing 443 block if there is
   one and replace only the `location` directives inside it.
5. Set `NEXT_PUBLIC_SITE_URL=https://www.antisocialtalks.com` — that alone
   switches robots.txt and the meta tag back to indexable.
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
| Images 404 | The read-only role needs **Read** on `directus_files`, not just the content collections |
| Forms return an error | The site token's policy needs **Create** on `submissions` — re-run `../cms/scripts/create-site-token.mjs`. Public-policy permissions do not apply to token requests |
| Shop says Gelato not connected | `GELATO_API_KEY` missing — `npm run verify:gelato` |
| Checkout returns 501 | Expected. No payment gateway implemented yet — see `web/src/lib/payments.ts` |
| `EACCES` in pm2 logs | The `chown` did not run. Run it on its own line |
| certbot: "could not find a matching server block" | The nginx file is not symlinked into `sites-enabled`, or `server_name` does not match the domain exactly |
| pm2 app named `web` or `...-new` | You started pm2 before the directory had its final name. `pm2 delete` it, `cd` into the correct directory, start again |
