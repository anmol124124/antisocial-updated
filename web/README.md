# AntiSocialTalks — Next.js app

The whole site in one Next.js 15 app: the public website, the Directus content
layer, the shop (Gelato and Qikink printing, Stripe payments), event bookings
and the community forms, including their API routes.

Requires Node 22.18 or newer (`../.nvmrc`) and Docker for the local CMS.

```bash
cd web
npm ci
npm run cms:up        # local Postgres + Directus on http://localhost:8055
npm run setup:local   # CMS schema, permissions, starter content, and DIRECTUS_TOKEN in .env.local
npm run dev           # http://localhost:3012
```

## Where everything lives

| Path | What it is |
| --- | --- |
| `src/app/` | Pages and API route handlers (App Router) |
| `src/lib/directus.ts` | Directus REST client: every content read and write goes through it |
| `src/lib/content.ts` | Episodes, guests, hosts, chapters, events, topics, products |
| `src/lib/site-content.ts` | Site settings (contact email, social links, share picture), home page, About values, community forms wording, Roadshow, Chapters guide |
| `src/lib/env.ts` | Site-wide settings (site address, indexing, CMS, Gelato key) with clear errors; each integration reads its own settings next to its code |
| `src/lib/rate-limit.ts` | Per-visitor limits on the public forms, quotes and checkout |
| `src/lib/gelato.ts`, `qikink.ts`, `stripe.ts`, `payments.ts`, `fulfilment.ts` | The shop: printing, payments, handing paid orders to the printer |
| `src/lib/legal.ts` | Terms and Privacy text (kept in code on purpose: it changes with the lawyer, not the team) |
| `src/components/` | UI by area: `site`, `home`, `episodes`, `guests`, `chapters`, `shop`, `forms`, `legal`, `ui` |
| `scripts/shop/` | Products into the CMS, merch artwork, Gelato look-ups and test orders |
| `scripts/events/` | Event posters into the CMS |
| `scripts/verify/` | Check Gelato, Stripe, the mailbox and the whole shop setup from a server |
| `scripts/dev/` | Local setup, starter content, the world map generator |
| `scripts/migrations/` | Applied history (Oct–Nov 2026). Don't run; see its README |
| `tests/` | Unit/API tests and the end-to-end run, against stand-ins for every outside service |

## Content: Directus is the source

Everything the team edits comes from Directus: episodes, guests, hosts,
chapters, events, blog posts, topics, products, and the site settings and page copy in
`site-content.ts`. Changes show within a minute, no deploy needed. What stays
in code: the page layouts and headings, form logic, the menus and the legal
pages.

Reads are fault-tolerant: if the CMS is unreachable or a collection is empty,
that part of the page is left out (or shows its empty state) instead of a 500,
and the reason is logged once on the server.

The CMS schema, the website's permissions and the starting content are in
`../cms` and applied with one command (`npm run cms:provision`, see
`../cms/README.md`). The local admin login is in `../cms/docker-compose.local.yml`
(throwaway values, never deployed). It is now `admin@example.com` (Directus rejects `.local`
addresses); a local CMS made before keeps its old login: pass `DIRECTUS_EMAIL`, or `npm run cms:down -- -v` to start fresh.

```bash
npm run cms:logs      # follow the Directus log
npm run cms:down      # stop, keeping the data
```

### Blog

`/blogs` lists the published posts in **Blog Posts** (newest first, the newest set
wide) and `/blogs/<slug>` shows one. A post is written in the CMS rich-text editor;
its HTML goes through `cleanPostHtml()` (`src/lib/blog-html.ts`) before it reaches
the page: only headings, paragraphs, lists, quotes, links, pictures and lines are
kept, and pictures inserted from the CMS library are served through `/api/assets`.
Drafts never show: the website policy can only read published posts, and the
query filters on it too. Leave the slug empty to make it from the title.

### Images

Uploaded files (pictures, and MP4/WebM video such as the teaser) are served
through `/api/assets/[id]`, which fetches from Directus server-side and
streams the result back. So the Directus token never
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

The merch range lives in `../assets/merch/products.json` and goes in with
`node scripts/shop/add-products.mjs ../assets/merch/products.json` (`--check` first; it only
checks Gelato and the files). Each product is one shop item with a colour
option: extra colours are `colorways`, each with its own Gelato template,
print files, mockup and swatch, or `"markets": ["IN"]` when only Qikink makes
it (it then needs a code in the product's `qikink.color_codes`). A colour's
model photo is picked up from `../assets/merch/photos/<slug>-<colour>.png`, or listed as
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
npm run lint
```

`npm test` runs the real route handlers against stand-ins for Directus,
Stripe, Gelato, Qikink and the mail providers (`tests/support/mocks.mjs`); no request
can leave the machine. `npm run test:e2e` builds the site twice (shop open,
then "Coming Soon"), serves it with `next start` and checks every page, link,
image and redirect, robots.txt, the sitemap and the API routes. Every value
from the `.env` files is blanked for that run. Stop `npm run dev` first: both
use the `.next` folder.

## Deploying

See `../deploy/README.md`. In short: the env file from `.env.production.example`
(or `.env.stage.example`) as `.env.local` on the server, `npm ci && npm run build`,
then `pm2 start ecosystem.config.cjs` (one process, `PORT` default 3012).
