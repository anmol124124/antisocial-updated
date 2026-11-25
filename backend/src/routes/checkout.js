import { Router } from 'express';
import { quoteOrder } from '../gelatoClient.js';
import { createPaymentIntent } from '../paymentGateway.js';

const router = Router();

// POST /api/checkout/quote
// Get an accurate shipping cost + delivery estimate before checkout, for
// whichever of UAE/Canada/USA/India the customer is shipping to.
router.post('/quote', async (req, res, next) => {
  try {
    const { items, shippingAddress, currency } = req.body;
    if (!items?.length || !shippingAddress?.country) {
      return res.status(400).json({ error: 'items[] and shippingAddress.country are required' });
    }
    const quote = await quoteOrder({
      currency: currency || 'USD',
      items,
      shippingAddress,
    });
    res.json(quote);
  } catch (err) {
    next(err);
  }
});

// POST /api/checkout
// Starts payment collection for a cart. Does NOT talk to Gelato yet — the
// Gelato order is only created after payment is confirmed, in the
// payment gateway's webhook handler (see routes/webhooks.js). This keeps
// you from ever printing something nobody paid for.
router.post('/', async (req, res, next) => {
  try {
    const { items, currency, customerEmail } = req.body;
    if (!items?.length) {
      return res.status(400).json({ error: 'items[] is required' });
    }
    const intent = await createPaymentIntent({ items, currency: currency || 'USD', customerEmail });
    res.json(intent);
  } catch (err) {
    next(err);
  }
});

export default router;
