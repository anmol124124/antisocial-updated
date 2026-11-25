# AntiSocialTalks CMS (Directus)

The admin panel where the team edits the website: episodes, guests, hosts, chapters,
events, shop products, the site settings (contact email, social links, share picture),
the home page pictures and topics, About values, the community forms' wording, the
Roadshow stops and the Chapters guide. It also receives the forms, bookings and orders.

Visitors never talk to Directus. The website reads and writes it server-side with its
own least-privilege token, and serves CMS pictures and video through `/api/assets`.

## Files

| Path | What |
|---|---|
| `docker-compose.yml` | Server: Directus **11.17.4** (pinned) + PostgreSQL 16, Directus on `127.0.0.1:8055` only |
| `docker-compose.local.yml` | Local development (throwaway credentials, never deployed) |
| `.env.example` | Server settings → copy to `.env` next to `docker-compose.yml` |
| `schema/snapshot.json` | The complete schema: every collection, field and relation |
| `schema/website-policy.json` | What the website's Directus user may do (read content, create forms/bookings/orders; nothing else) |
| `seed/content.json`, `seed/files/` | Starting content for the site settings and page copy, with its pictures and the teaser clip |
| `scripts/provision.mjs` | Applies the three above to any Directus. Safe to re-run |
| `scripts/create-site-token.mjs` | Creates/rotates the website's Directus user and token, and proves what it can and can't do |
| `nginx/` | HTTPS proxy configs for `cms.` / `cms-stage.antisocialtalks.com` |

## Provisioning: one command

```bash
DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=<admin> DIRECTUS_PASSWORD=<password> \
  node cms/scripts/provision.mjs --dry-run      # shows what would change
DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=<admin> DIRECTUS_PASSWORD=<password> \
  node cms/scripts/provision.mjs
```

1. **Schema**: adds what is missing and updates what differs. Never deletes: anything in
   the CMS that is not in the snapshot is listed and kept (`--allow-deletes` to remove it).
2. **Website permissions**: adds or updates the rules in `website-policy.json`; extra
   rules are listed, never removed.
3. **Starting content**: fills a collection only while it is still **empty**, so nothing
   the team has edited is ever overwritten.

The snapshot was taken on Directus 11.17.4. On a different version the script stops and
says so; upgrade the container (back up first, below) or pass `--force`.

Tested on an empty Directus and on one in the state the live CMS was in before this
restructure: both end up identical, and a second run changes nothing.

## Local development

From `web/`: `npm run cms:up`, then `npm run setup:local` (provision + a few starter
rows + the website token written into `web/.env.local`). Dashboard: http://localhost:8055,
login in `docker-compose.local.yml`.

## Server

### First install

```bash
cp .env.example .env          # fill in: openssl rand -hex 32 for KEY, SECRET, DB_PASSWORD; a real ADMIN_EMAIL/PASSWORD
docker compose up -d
DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=… DIRECTUS_PASSWORD=… node scripts/provision.mjs
DIRECTUS_URL=http://127.0.0.1:8055 DIRECTUS_EMAIL=… DIRECTUS_PASSWORD=… node scripts/create-site-token.mjs /root/site-token
# put the token into the website's .env.local as DIRECTUS_TOKEN, then delete the file
```

HTTPS: the config in `nginx/`, a Cloudflare DNS record for the CMS host, and a certificate
with certbot. See `../deploy/README.md` for the full order.

### Updating an existing CMS (e.g. after this restructure)

```bash
docker exec <directus-container> node -e "console.log(require('/directus/package.json').version)"   # which version runs
# back up first (below), then:
node scripts/provision.mjs --dry-run      # read the list
node scripts/provision.mjs
```

The existing website token keeps working; `create-site-token.mjs` is only needed for a new one.

### Backups

```bash
docker exec <postgres-container> pg_dump -U directus directus | gzip > cms-$(date +%F).sql.gz
docker run --rm -v <project>_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```

## Changing the schema

Make the change in a local Directus (dashboard or script), then save it into the repo:

```bash
curl -s -H "Authorization: Bearer <admin token>" http://localhost:8055/schema/snapshot \
  | node -e 'process.stdout.write(JSON.stringify(JSON.parse(require("fs").readFileSync(0)).data,null,2)+"\n")' \
  > cms/schema/snapshot.json
```

A new collection the website reads also needs its `read` rule in `schema/website-policy.json`.
Commit both; `provision.mjs` applies them everywhere. No more one-off dated scripts
(the old ones are in `web/scripts/migrations/`, as history).

## Security notes

- Nothing in the CMS is public. The website uses its own token; the **Public** policy
  stays empty. (Do not give Public "create" on `submissions`: that would let anyone
  write to the CMS directly and skip the website's checks and limits.)
- Directus listens on `127.0.0.1` only; it is reached through nginx.
- The admin login page is on the internet. Restricting `/admin` and `/auth` to the team
  (nginx `allow`/`deny`, or Cloudflare Access) is recommended; it is a server decision.

### Licence

Directus is free for organisations under US$5 million total annual revenue / funding
(Business Source Licence); above that a commercial licence is needed.
