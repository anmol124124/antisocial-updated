// Payment gateway abstraction. Deliberately left unimplemented: which
// gateway to use (Stripe, Razorpay, or both split by region) is a business
// decision, not a technical one. This file is the ONE place that decision
// needs to be wired in — routes/checkout.js and routes/webhooks.js never
// talk to Stripe/Razorpay directly, only through these three functions.
//
// When ready, implement each function for the chosen gateway(s) and set
// PAYMENT_GATEWAY in .env. Nothing else in the backend needs to change.

const GATEWAY = process.env.PAYMENT_GATEWAY || 'none';

function notConfigured() {
  const err = new Error(
    `No payment gateway configured (PAYMENT_GATEWAY=${GATEWAY}). ` +
      'Implement src/paymentGateway.js for Stripe and/or Razorpay, then set PAYMENT_GATEWAY in .env.'
  );
  err.status = 501;
  throw err;
}

/**
 * Start a payment for a cart. Should return whatever the frontend needs to
 * collect payment (e.g. a Stripe client_secret, or a Razorpay order id).
 * @param {{items: Array<{productUid:string, quantity:number, unitPrice:number}>, currency: string, customerEmail: string}} cart
 */
export async function createPaymentIntent(cart) {
  if (GATEWAY === 'none') notConfigured();
  throw new Error(`createPaymentIntent not implemented for gateway "${GATEWAY}"`);
}

/**
 * Verify an inbound webhook actually came from the payment gateway
 * (signature check) before trusting it. Return the raw verified event.
 * @param {import('express').Request} req - use req.rawBody, see server.js
 */
export async function verifyWebhookSignature(req) {
  if (GATEWAY === 'none') notConfigured();
  throw new Error(`verifyWebhookSignature not implemented for gateway "${GATEWAY}"`);
}

/**
 * Given a verified webhook event, extract the info needed to place the
 * Gelato order: which cart/order this was, and the confirmed shipping
 * address (many gateways collect the address during checkout).
 * Return null if the event isn't a "payment succeeded" event.
 */
export async function extractPaidOrder(event) {
  if (GATEWAY === 'none') notConfigured();
  throw new Error(`extractPaidOrder not implemented for gateway "${GATEWAY}"`);
}
