import type { Metadata } from 'next';
import { PaymentComplete } from '@/components/shop/PaymentComplete';

export const metadata: Metadata = {
  title: 'Payment',
  description: 'Confirming your AntiSocialTalks payment.',
  robots: { index: false, follow: false },
};

/** Stripe returns here with ?session_id=... after the visitor pays (shop orders and paid bookings). */
export default function PaymentCompletePage() {
  return <PaymentComplete />;
}
