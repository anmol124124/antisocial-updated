import { Router } from 'express';
import crypto from 'node:crypto';
import { createOrder, getOrder } from '../gelatoClient.js';
import { verifyWebhookSignature, extractPaidOrder } from '../paymentGateway.js';

const router = Router();

// POST /api/webhooks/payment
// The payment gateway calls this once a payment succeeds. This is the
// ONLY place a Gelato order gets created, so a customer is never charged
// without an order being placed, and nothing is ever printed unpaid.
router.post('/payment', async (req, res, next) => {
  try {
    const event = await verifyWebhookSignature(req);
    const paidOrder = await extractPaidOrder(event);
    if (!paidOrder) {
      // Not a "payment succeeded" event (e.g. a refund or a failed charge) — ignore.
      return res.status(200).json({ received: true, ignored: true });
    }

    const gelatoOrder = await createOrder({
      orderReferenceId: paidOrder.orderReferenceId,
      customerReferenceId: paidOrder.customerReferenceId,
      currency: paidOrder.currency,
      items: paidOrder.items,
      shippingAddress: paidOrder.shippingAddress,
    });

    // TODO: persist gelatoOrder.id against paidOrder.orderReferenceId in
    // your own order store, and email the customer a confirmation.

    res.status(200).json({ received: true, gelatoOrderId: gelatoOrder.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/gelato
// Gelato calls this on production/shipment status changes, if you add a
// webhook subscription in the Gelato dashboard. Verify the shared-secret
// signature Gelato sends (header name is set when you create the
// subscription — check the payload it actually sends and adjust below).
router.post('/gelato', async (req, res, next) => {
  try {
    const secret = process.env.GELATO_WEBHOOK_SECRET;
    const signature = req.get('X-Gelato-Signature');
    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
      if (!signature || signature !== expected) {
        return res.status(401).json({ error: 'invalid signature' });
      }
    }

    const { orderId, event: gelatoEvent } = req.body;
    // TODO: update your own order record's status (e.g. "shipped",
    // "delivered") based on gelatoEvent, and notify the customer.
    console.log(`Gelato webhook: order ${orderId} -> ${gelatoEvent}`);

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/webhooks/order-status/:orderId — simple polling fallback if you
// haven't set up the Gelato webhook subscription yet.
router.get('/order-status/:orderId', async (req, res, next) => {
  try {
    res.json(await getOrder(req.params.orderId));
  } catch (err) {
    next(err);
  }
});

export default router;
