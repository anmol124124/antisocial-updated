import { NextResponse } from 'next/server';
import { createSubmission } from '@/lib/directus';
import { sendMail, summarise, teamInbox } from '@/lib/mailer';
import { isSubmissionType } from '@/lib/community';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


/**
 * Proxies the community forms and the footer newsletter into the Directus
 * `submissions` collection.
 *
 * Going through the server rather than posting from the browser means the
 * Directus URL and token stay server-side, and the payload is validated and
 * whitelisted before it reaches the CMS.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'submissions');
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  // Honeypot: real visitors never see this field, so anything in it is a bot.
  if (body.website) return NextResponse.json({ ok: true });

  const type = String(body.type || '');
  if (!isSubmissionType(type)) {
    return NextResponse.json({ error: 'Unknown form.' }, { status: 400 });
  }

  const email = String(body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const message = String(body.message || '').trim();
  if (type !== 'community' && message.length < 10) {
    return NextResponse.json({ error: 'Please write a little more so we can act on it.' }, { status: 400 });
  }

  // Only these fields are forwarded; anything else in the request is dropped.
  const payload = {
    type,
    name: String(body.name || '').trim().slice(0, 200),
    email,
    message: message.slice(0, 5000),
    interest: body.interest ? String(body.interest).slice(0, 50) : null,
    consent_email: body.consent_email === true,
    reviewed: false,
  };

  try {
    await createSubmission(payload);
  } catch (err) {
    // The detail is for the log; the visitor gets a plain message.
    console.error('[submissions]', err);
    return NextResponse.json({ error: 'We couldn’t record that just now. Please try again shortly.' }, { status: 502 });
  }

  const inbox = teamInbox();
  if (inbox) {
    await sendMail({
      to: inbox,
      replyTo: email,
      subject: `New ${type} submission from the website`,
      text: summarise(
        { name: payload.name, email, interest: payload.interest, message: payload.message, consent_email: payload.consent_email ? 'yes' : 'no' },
        { name: 'Name', email: 'Email', interest: 'Interest', message: 'Message', consent_email: 'Email updates' },
      ),
    });
  }

  return NextResponse.json({ ok: true });
}
