# AntiSocialTalks

The website (antisocialtalks.com): podcast episodes and guests, chapters and events
with bookings, the community forms, and the merch shop. Content is edited by the team
in a Directus CMS.

```
 Visitor ──► Cloudflare ──► nginx ──► Next.js app (web/, pm2) ──► Directus (cms/, Docker, 127.0.0.1)
                                          │
                                          └──► Stripe · Gelato · Qikink · email (server-side only)
```

| Folder | What |
|---|---|
| [`web/`](web/README.md) | The Next.js 15 app: pages, API routes, tests, operational scripts |
| [`cms/`](cms/README.md) | Directus: compose files, the schema, the website's permissions, starting content, and the one provisioning script |
| [`deploy/`](deploy/README.md) | Server guide and nginx configs |
| `assets/` | Source artwork uploaded to the CMS by scripts (merch designs and photos, event posters). Not served by the app |

## Run it locally

Needs Node 22.18+ (`.nvmrc`) and Docker.

```bash
cd web
npm ci
npm run cms:up        # local Directus on http://localhost:8055
npm run setup:local   # schema + permissions + starter content + website token in .env.local
npm run dev           # http://localhost:3012
```

## Checks

```bash
cd web
npm run lint && npm run typecheck && npm test && npm run test:e2e
```

## Branches

- `main`: the code as received (`antisocial_updated.zip`). Tag `legacy-static-site` keeps
  the removed old static site, Express backend and old merch files.
- `feature/code-restructure`: this restructure; what goes to production.
- `feature/code-changes`: new changes, branched from the restructure, checked on staging first.

## Secrets

Real settings live only in `web/.env.local` and `cms/.env` on each machine and are never
committed. The `*.env.example` files list every setting with an explanation.
