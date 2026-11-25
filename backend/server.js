import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import productsRouter from './src/routes/products.js';
import checkoutRouter from './src/routes/checkout.js';
import webhooksRouter from './src/routes/webhooks.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);

// Capture the raw body too (needed to verify payment-gateway webhook
// signatures, which are computed over the exact raw bytes, not the
// re-serialized JSON).
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api', productsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/webhooks', webhooksRouter);

// Central error handler — every route above calls next(err) on failure.
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'internal error' });
});

const port = process.env.PORT || 3011;
app.listen(port, () => {
  console.log(`antisocialtalks POD backend listening on :${port}`);
});
