import { NextResponse } from 'next/server';
import { marketForCountry } from '@/lib/markets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/market: the visitor's shopping market from their country.
 * Cloudflare adds CF-IPCountry to every proxied request; without it (local
 * development) the visitor gets the default market on the client.
 */
export function GET(request: Request) {
  const country = request.headers.get('cf-ipcountry');
  if (!country || country === 'XX' || country === 'T1') return NextResponse.json({ market: null });
  return NextResponse.json({ market: marketForCountry(country), country });
}
