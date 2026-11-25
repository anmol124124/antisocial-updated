'use client';

import { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/Button';
import { useCart } from './CartProvider';
import { postApi } from '@/lib/api-client';

type Result = { state: 'paid' | 'pending' | 'unpaid'; kind: 'shop' | 'ticket'; message: string };

const TITLES: Record<Result['state'], Record<Result['kind'], string>> = {
  paid: { shop: 'Thank you.', ticket: 'You’re booked.' },
  pending: { shop: 'Payment processing.', ticket: 'Payment processing.' },
  unpaid: { shop: 'Payment not completed.', ticket: 'Payment not completed.' },
};

/**
 * Where Stripe sends the visitor after paying. The server checks the payment
 * with Stripe and delivers the order; the cart is emptied once a shop order
 * is paid (or is clearing), so nobody pays for it twice.
 */
export function PaymentComplete() {
  const { clear } = useCart();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    // Read in the browser, so the page itself stays static (and renders its heading on the server).
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';
    if (!sessionId) {
      setError('We couldn’t find that payment.');
      return;
    }
    postApi('/api/payments/confirm', { session_id: sessionId })
      .then((body) => {
        const r = body as Result;
        if (r.kind === 'shop' && r.state !== 'unpaid') clear();
        setResult(r);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'We couldn’t confirm the payment just now.'));
  }, [clear]);

  const ticket = result?.kind === 'ticket';
  const title = error ? 'We couldn’t confirm it here.' : result ? TITLES[result.state][result.kind] : 'Confirming your payment…';

  return (
    <section className="min-h-[60vh] bg-cream py-20">
      <Container>
        <Eyebrow>{ticket ? 'Your booking' : 'Your order'}</Eyebrow>
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{title}</h1>
        <p role="status" className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-mute">
          {error || result?.message || 'One moment while we check with the payment provider.'}
        </p>
        {(result || error) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {result?.state === 'unpaid' ? (
              <Button href={ticket ? '/events' : '/checkout'} variant="solid-dark" arrow>
                {ticket ? 'Back to the Events' : 'Back to Checkout'}
              </Button>
            ) : (
              <Button href={ticket ? '/events' : '/shop'} variant="solid-dark" arrow>
                {ticket ? 'See the Events' : 'Back to the Shop'}
              </Button>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
