# AntiSocialTalks — Next.js app

The whole site in one Next.js 15 app: the public website, the Directus content
layer, and the Gelato print-on-demand shop (including its API routes). There is
no separate Express process any more — `../backend` stays in the repo as
reference, but nothing runs from it.

```bash
cd web
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3012
```

## Where everything lives

| Path | What it is |
| --- | --- |
| `src/app/` | Pages and API route handlers (App Router) |
| `src/lib/directus.ts` | Typed Directus REST client — every content read goes through it |
| `src/lib/content.ts` | The queries: episodes, guests, hosts, chapters, topics, products |
| `src/lib/gelato.ts` | Direct Gelato REST client (catalog, quote, order) |
| `src/lib/payments.ts` | Taking money through Stripe, and handing paid orders to the printer (`fulfilment.ts`) |
| `src/components/` | UI, split by area: `site`, `home`, `episodes`, `guests`, `shop`, `forms`, `ui` |
| `scripts/verify-gelato.mjs` | Checks the Gelato key actually works |
| `scripts/seed-directus.mjs` | Adds the `topics` + `shop_products` collections and seeds content |

## Content: Directus is the only source

Nothing on this site is hardcoded content. Episodes, guests, hosts, chapters,
topics and shop products are all read from Directus, which means the team can
change any of it without a deploy — including the "Coming Soon" → "Watch
Episode" swap, which is just the `status` field on an episode row.

The trade-off: **until the CMS is up and populated, every section renders an
empty state.** That is deliberate, not a bug — each empty state names the
collection you need to add a row to. Reads are also fault-tolerant: if Directus
is unreachable, pages render their empty state instead of throwing a 500 at a
visitor, and the reason is logged server-side once.

### Running Directus locally (development)

Needs **Docker Desktop** — Directus depends on `isolated-vm`, a native module
that will not install from npm on Windows without Visual Studio Build Tools.
Docker sidesteps that entirely.

```bash
npm run cms:up        # starts Postgres + Directus on http://localhost:8055
npm run setup:local   # schema + seed content + writes DIRECTUS_TOKEN into .env.local
npm run dev           # http://localhost:3012
```

`setup:local` is idempotent. It waits for Directus to come up, logs in, gives
the admin a static token (so nothing has to be made public locally), then runs
`../cms/provision-schema.js` followed by `scripts/seed-directus.mjs`.

Local dashboard: <http://localhost:8055> — `admin@antisocialtalks.local` /
`admin1234`, set in `../cms/docker-compose.local.yml`. Those credentials are
throwaway dev values; that file is never deployed.

```bash
npm run cms:logs      # follow the Directus log
npm run cms:down      # stop, keeping the data
```

### Getting content in (production)

1. Deploy Directus on the VPS — see `../cms/README.md`.
2. Run the original schema provisioner: `node ../cms/provision-schema.js`.
3. Run this app's seeder, which adds the two extra collections the website
   needs and seeds the content the old static page had hardcoded:

   ```bash
   DIRECTUS_URL=https://cms.antisocialtalks.com \
   DIRECTUS_EMAIL=you@example.com \
   DIRECTUS_PASSWORD='...' \
   npm run seed
   ```

   Safe to re-run — it only creates what is missing and never overwrites edits.

4. Give the site its own token:

   ```bash
   DIRECTUS_URL=... DIRECTUS_EMAIL=... DIRECTUS_PASSWORD=... \
   node scripts/create-site-token.mjs
   ```

   Its policy reads the content collections and files and creates
   submissions, nothing more; the script verifies that before printing the
   token for `DIRECTUS_TOKEN`. Nothing in the CMS is made public.

   Don't try to cover the forms with the Public policy instead: Directus never
   applies Public permissions to a request that carries a token, so the forms
   would 403.

### Images

Uploaded files are served through `/api/assets/[id]`, which fetches from
Directus server-side and streams the result back. So the Directus token never
reaches the browser, images work whether or not the collections are public, and
the CMS hostname never appears in the HTML — moving the CMS is an env change.

## Gelato

`GELATO_API_KEY` is the only required value. Get it from
dashboard.gelato.com → Store → API keys, put it in `.env.local`, then:

```bash
npm run verify:gelato
```

That lists the catalogs your account can print from and prints real
`productUid` values. Put one on a `shop_products` row in Directus as
`gelato_product_uid`, add a `price` and a publicly-reachable `print_file_url`,
set status to Published — the product appears in the shop.

The merch range lives in `merch/products.json` and goes in with
`node scripts/add-products.mjs merch/products.json` (`--check` first; it only
checks Gelato and the files). Each product is one shop item with a colour
option: extra colours are `colorways`, each with its own Gelato template,
print files, mockup and swatch, or `"markets": ["IN"]` when only Qikink makes
it (it then needs a code in the product's `qikink.color_codes`). A colour's
model photo is picked up from `merch/photos/<slug>-<colour>.png`, or listed as
its `photo`, with more photos in its `gallery` (the first colour's are the
product's `photo` and `gallery`); the first photo is the one the shop card
shows. `--only-colours` updates just the colours of products already in the
CMS, `--only=<slug>,<slug>` adds or updates just those products, and
`--order` sets just the shop order (`sort`). A product without a `qikink`
setting (the caps, for now) is not sold in India.

### The order of operations at checkout

This sequence is the thing that stops you paying to print something nobody
bought:

1. **`POST /api/gelato/quote`**: the delivery options for this cart and
   address, in the delivery country's currency: free Qikink delivery in India,
   Gelato's quote elsewhere. Prices are re-read from the CMS and only the
   options go back to the browser. Nothing is ordered.
2. **`POST /api/checkout`**: re-prices the cart from the CMS (so a tampered
   cart cannot set its own price), re-quotes delivery, records the order in the
   CMS `orders` collection as pending and opens a Stripe Checkout page for it.
   Still nothing at the printer.
3. **`POST /api/payments/confirm`** (from `/payment/complete`, where Stripe
   sends the visitor back) and **`POST /api/webhooks/payment`** (Stripe's
   webhook, the safety net): both check the payment with Stripe itself (paid,
   amount, currency) and **only then** send the order to the printer: Qikink
   for India, Gelato elsewhere. Settling twice is harmless: one print order
   per payment.

`POST /api/webhooks/gelato` takes Gelato's status updates (Qikink has no
webhook; the order job asks it). The body only says
which order changed; status and tracking are read back from Gelato's API, so a
forged call can at most trigger a re-check.

`POST /api/cron/orders`, every 5 minutes with `Authorization: Bearer
$CRON_SECRET`: shipping emails with tracking, the cancels and refunds the team
sets in the CMS, and unfinished checkouts (a missed payment is recovered, an
unpaid one is abandoned after a day).

With Stripe test keys (`sk_test_…`) every Gelato order is a draft, and a Qikink
order is only sent when `QIKINK_BASE_URL` is the Qikink sandbox: nothing is
printed or billed. Qikink has no cancel call: a cancelled India order is
stopped in the Qikink dashboard, then refunded with "Refund only".

## Payments

Markets (`src/lib/markets.ts`): India is priced and paid in INR; the US,
Canada, the UK and the UAE are priced and paid in USD (`shop_products.prices`
holds `{ "INR": …, "USD": … }`). Visitors from anywhere else see USD prices.
There is no price menu: the market is the visitor's country (Cloudflare's
`CF-IPCountry`, read by `GET /api/market`), and at checkout the delivery
country decides it for the rest of the visit.

The selling company is in Canada, so payments go through Stripe:
`PAYMENT_GATEWAY=stripe` with `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
(webhook events `checkout.session.completed` and
`checkout.session.async_payment_succeeded`). India orders also need
`QIKINK_CLIENT_ID` and `QIKINK_CLIENT_SECRET`, and each product's `qikink`
setting in the CMS (SKU template, sizes, print sizes).
Without them `/api/checkout` answers 501 and paid event bookings stay closed.
`NEXT_PUBLIC_SHOP_OPEN=false` shows the shop as "Coming Soon" and sends `/cart`
and `/checkout` to `/shop`; it is read at build time.

## Testing

```bash
npm test           # unit and API tests, offline (Node 22.18+ or 24)
npm run test:e2e   # production build + crawl against a stand-in CMS
npm run typecheck
```

`npm test` runs the real route handlers against stand-ins for Directus,
Stripe, Gelato, Qikink and the mail providers (`tests/support/mocks.mjs`); no request
can leave the machine. `npm run test:e2e` builds the site twice (shop open,
then "Coming Soon"), serves it with `next start` and checks every page, link,
image and redirect, robots.txt, the sitemap and the API routes. Every value
from the `.env` files is blanked for that run. Stop `npm run dev` first: both
use the `.next` folder.

## Deploying

```bash
npm run build
npm run start     # binds :3012
```

Behind nginx, proxy the site to `127.0.0.1:3012`. Under pm2, run
`npm run start` rather than `next dev`, and ship `.env.local` to the server
separately — never commit it.
