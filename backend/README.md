# antisocialtalks — Gelato print-on-demand backend

Talks to Gelato's REST API directly — no Shopify, no Printify marketplace,
no broker. This backend is the piece a static HTML site can't have on its
own: somewhere to hold the Gelato API key and to trigger orders only after
a payment has actually been confirmed.

## Why this exists

`antisocialtalks.com` is a static `index.html`. A print-on-demand API key
can never live in browser JavaScript (anyone viewing page source could
steal it and place orders on your account), so a small server is required
regardless of which POD provider is used. This is that server.

## Flow

```
Browser (antisocialtalks.com)
  -> GET  /api/catalogs, /api/products/:uid      (browse products)
  -> POST /api/checkout/quote                    (shipping cost/time for AE/CA/US/IN)
  -> POST /api/checkout                          (start payment)
  -> [customer pays on the gateway's checkout UI]
  -> gateway calls POST /api/webhooks/payment     (server-to-server, not the browser)
       -> backend verifies the webhook signature
       -> backend calls Gelato createOrder()
       -> Gelato prints + ships directly to the customer
  -> Gelato calls POST /api/webhooks/gelato       (optional: shipment status updates)
```

A Gelato order is only ever created from the payment webhook handler, never
from the checkout request itself — so nothing gets printed unless it was
actually paid for.

## What's implemented vs. stubbed

| Piece | Status |
|---|---|
| Gelato product catalog, quote, order create/get/cancel | Implemented — `src/gelatoClient.js` |
| Express routes wiring the above up | Implemented — `src/routes/` |
| Payment gateway (Stripe / Razorpay / etc.) | **Stubbed** — `src/paymentGateway.js` throws until you implement it |

Payment gateway was left unimplemented on purpose: which gateway(s) to use
for UAE/Canada/USA/India is a business decision. When you're ready, that's
the only file that needs real logic — nothing else in the backend talks to
the gateway directly.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# fill in GELATO_API_KEY from https://dashboard.gelato.com (Store -> API keys)
npm run dev
curl http://localhost:3011/api/health
```

## Before taking real payments

1. Implement `createPaymentIntent`, `verifyWebhookSignature`, and
   `extractPaidOrder` in `src/paymentGateway.js` for your chosen gateway.
2. Get a Gelato **test** API key and place one real test order end-to-end.
   Gelato does version/adjust its order payload over time — diff what you
   send against <https://dashboard.gelato.com/docs/orders/v3/create/>
   before switching to a live key.
3. Set `GELATO_WEBHOOK_SECRET` if you add a webhook subscription in the
   Gelato dashboard, so `/api/webhooks/gelato` can verify it's really Gelato.

## Deploying to the VPS

Same side-by-side swap pattern as the other apps on `wbsnj`:

```powershell
# from your PC
scp -r backend ubuntu@wbsnj:/home/ubuntu/antisocialtalks-backend-new
```

```bash
# on the VPS
cd /home/ubuntu/antisocialtalks-backend-new
npm install --omit=dev
cp .env.example .env   # then fill in real values, never upload .env from Windows
pm2 start ecosystem.config.cjs
pm2 save
```

Then add an nginx location block on `antisocialtalks.com` proxying
`/api/` to `http://localhost:3011/`, next to the existing static
`location /` block, and `sudo certbot`/`nginx -t`/`reload` as usual. Ports
3000–3010 are taken by other apps on this VPS; 3011 is free (see
`ecosystem.config.cjs`).
