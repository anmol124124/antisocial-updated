import { NextResponse } from 'next/server';
import { queryItems } from '@/lib/directus';
import { syncShipment } from '@/lib/order-ops';
import type { OrderRow } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/gelato  (Gelato dashboard -> Developer -> Webhooks)
 *
 * Gelato calls this when an order moves on: printed, shipped, tracking added,
 * delivered. The body is only used to know WHICH order changed. Its status and
 * tracking are then read back from Gelato's API with our key, so a forged call
 * can at most make us re-check an order. The cron route does the same check
 * every few minutes, so a missed webhook only delays the email.
 */
export async function POST(request: Request) {
  let event: { orderId?: string; orderReferenceId?: string; event?: string };
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  // Our orders are sent as "AST-<CMS order id>"; tests and previews use other prefixes.
  const match = /^AST-(\d+)$/.exec(event.orderReferenceId || '');
  if (!match) return NextResponse.json({ ok: true, ignored: true });

  try {
    const [order] = await queryItems<OrderRow>('orders', {
      filter: JSON.stringify({ id: { _eq: Number(match[1]) } }),
      fields: '*',
      limit: '1',
    });
    if (!order || (event.orderId && order.gelato_order_id && order.gelato_order_id !== event.orderId)) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const result = await syncShipment(order);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    // 5xx: Gelato retries, and the cron route catches it anyway.
    console.error('[webhooks/gelato]', err);
    return NextResponse.json({ error: 'Could not update the order.' }, { status: 500 });
  }
}
