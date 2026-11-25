import { NextResponse } from 'next/server';
import { createItem, insertItem, queryItems, updateItem } from '@/lib/directus';
import { eventSlug, getEventByInviteCode, getEventBySlug, type ChapterEvent } from '@/lib/content';
import { guestKey, invitationMail } from '@/lib/invitation';
import { contactEmailFor } from '@/lib/site-content';
import {
  MAX_PER_BOOKING,
  formatPrice,
  registrationFields,
  statusOf,
  ticketPrice,
  validateFields,
  type FormMode,
} from '@/lib/chapters';
import { sendMail, summarise, teamInbox } from '@/lib/mailer';
import { paymentsAreConfigured, startPayment } from '@/lib/payments';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONFIRMATION: Record<FormMode, { subject: string; message: string }> = {
  interest: {
    subject: 'You’re on the list',
    message: 'You’re on the list. We’ll email you when dates, the venue and registration details are announced.',
  },
  booking: {
    subject: 'Your place is booked',
    message: 'Your place is booked. We’ll email the venue and timings closer to the date.',
  },
  rsvp: {
    subject: 'Your RSVP is in',
    message: 'Your RSVP is in. Places are limited, so the team confirms every guest. Once yours is confirmed, we’ll email you the venue and the details.',
  },
  waitlist: {
    subject: 'You’re on the waitlist',
    message: 'You’re on the waitlist. If a place opens up, we’ll email you straight away.',
  },
};

/** How long the Stripe payment page for a paid booking stays open. */
const PAY_WITHIN_MINUTES = 31;
/** How long an unpaid booking holds its places: a little longer than the payment page lives. */
const HOLD_MINUTES = 35;

/**
 * POST /api/chapters/register
 *
 * Interest, booking, RSVP or waitlist for one event, whichever its status
 * allows. Bookings respect the event's capacity. For a paid event the booking
 * is held as "awaiting payment" and the response carries a Stripe Checkout
 * URL; the place is confirmed when the payment settles (lib/payments).
 *
 * With `invite`, the guest is accepting a private invitation link instead
 * (see acceptInvitation below).
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'register');
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  // Honeypot: real visitors never see this field.
  if (body.website) return NextResponse.json({ ok: true, message: CONFIRMATION.interest.message });

  if (body.invite !== undefined) return acceptInvitation(body);

  const event = await getEventBySlug(String(body.event || ''));
  if (!event) return NextResponse.json({ error: 'That event could not be found.' }, { status: 404 });

  const { mode, label } = statusOf(event.status);
  if (mode === 'closed') {
    return NextResponse.json({ error: `Registration is closed. This event is ${label.toLowerCase()}.` }, { status: 409 });
  }
  if (mode === 'soon') {
    return NextResponse.json(
      { error: 'Details for this event are coming soon. Join the community to hear first.' },
      { status: 409 },
    );
  }
  if (mode === 'private') {
    return NextResponse.json(
      { error: 'This is a private event. Invitations and RSVP links are sent personally by email.' },
      { status: 403 },
    );
  }

  const fields = registrationFields(mode);
  const result = validateFields(fields, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (body.accepted_terms !== true) {
    return NextResponse.json({ error: 'Please accept the event terms and privacy notice.' }, { status: 400 });
  }

  const values = result.values;
  const price = mode === 'booking' ? ticketPrice(event) : null;
  const attendees = mode === 'booking' ? Number(values.attendees) || 1 : 0;

  if (mode === 'booking') {
    if (price && attendees > MAX_PER_BOOKING) {
      return NextResponse.json({ error: `You can book up to ${MAX_PER_BOOKING} places at a time.` }, { status: 400 });
    }
    if (price && !paymentsAreConfigured()) {
      console.warn('[chapters/register] paid event but payments are off: set PAYMENT_GATEWAY=stripe and STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Booking for this event opens soon. Please check back shortly.' }, { status: 503 });
    }
    try {
      const left = await placesLeft(event);
      if (left !== null && attendees > left) {
        return NextResponse.json(
          { error: left > 0 ? `Only ${left} ${left === 1 ? 'place is' : 'places are'} left.` : 'This event is now full.' },
          { status: 409 },
        );
      }
    } catch (err) {
      console.error('[chapters/register] capacity check', err);
      return NextResponse.json({ error: 'We couldn’t check availability just now. Please try again shortly.' }, { status: 502 });
    }
  }

  const row = {
    event: event.id,
    kind: mode,
    status: mode === 'waitlist' ? 'waitlist' : price ? 'awaiting_payment' : mode === 'booking' ? 'confirmed' : 'received',
    payment_status: price ? 'pending' : 'not_required',
    ...values,
    accepted_terms: true,
    marketing_opt_in: body.marketing_opt_in === true,
  };

  /* Paid booking: hold the places and hand back a Stripe Checkout page. */
  if (price) {
    try {
      const registration = await insertItem('event_registrations', row);
      // Two people can pass the check above at the same moment. Counting again with this
      // booking in place settles it: whoever tipped it over the capacity is released.
      const after = await balance(event);
      if (after !== null && after < 0) {
        await updateItem('event_registrations', registration, { status: 'cancelled', payment_status: 'not_required' });
        return NextResponse.json({ error: 'This event is now full.' }, { status: 409 });
      }
      const payment = await startPayment({
        kind: 'ticket',
        currency: price.currency,
        lines: [{ name: `${event.title}: ticket`, unitPrice: price.amount, quantity: attendees }],
        customer: { name: String(values.full_name), email: String(values.email), phone: String(values.phone || '') },
        description: `${event.title}: ${attendees} × ${formatPrice(price)}`,
        returnTo: `/events/${eventSlug(event)}#register`,
        expiresInMinutes: PAY_WITHIN_MINUTES,
        extra: { event: event.id, registration },
      });
      return NextResponse.json({ ok: true, payment });
    } catch (err) {
      console.error('[chapters/register] paid booking', err);
      return NextResponse.json({ error: 'We couldn’t start the payment. Please try again shortly.' }, { status: 502 });
    }
  }

  try {
    await createItem('event_registrations', row);
  } catch (err) {
    console.error('[chapters/register]', err);
    return NextResponse.json({ error: 'We couldn’t record that just now. Please try again shortly.' }, { status: 502 });
  }

  const { subject, message } = CONFIRMATION[mode];
  const where = event.city || event.region || '';

  await Promise.all([
    sendMail({
      to: String(values.email),
      subject: `${subject}: ${event.title}`,
      text: `Hi ${values.full_name},\n\n${message}\n\nEvent: ${event.title}${where ? ` (${where})` : ''}${
        attendees ? `\nPlaces: ${attendees}` : ''
      }\n\nThe AntiSocialTalks team`,
    }),
    teamInbox()
      ? sendMail({
          to: teamInbox()!,
          replyTo: String(values.email),
          subject: `New ${mode === 'rsvp' ? 'RSVP' : `${mode} registration`}: ${event.title}`,
          text: summarise(
            { ...values, marketing_opt_in: body.marketing_opt_in === true ? 'yes' : 'no' },
            Object.fromEntries(fields.map((f) => [f.name, f.label])),
          ),
        })
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ ok: true, message });
}

/**
 * A guest accepting a private invitation link (/invite/<code>). The link is
 * the invitation, so there is no review: the guest goes on the list as
 * confirmed and is emailed their invitation, with the venue the CMS keeps for
 * invited guests and a calendar entry. Accepting twice adds no second row; the
 * invitation is just sent again. The event's capacity, when set, caps the list.
 */
async function acceptInvitation(body: Record<string, unknown>) {
  const event = await getEventByInviteCode(String(body.invite || ''));
  if (!event) {
    return NextResponse.json(
      { error: 'This invitation link is not valid. Please check it with the person who sent it to you.' },
      { status: 403 },
    );
  }
  const { mode, label } = statusOf(event.status);
  if (mode === 'closed') {
    return NextResponse.json({ error: `This event is ${label.toLowerCase()}, so the invitation is closed.` }, { status: 409 });
  }

  const fields = registrationFields('rsvp');
  const result = validateFields(fields, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  if (body.accepted_terms !== true) {
    return NextResponse.json({ error: 'Please accept the event terms and privacy notice.' }, { status: 400 });
  }

  const email = String(result.values.email).toLowerCase();
  const values: Record<string, string | number | null> = { ...result.values, email };
  const key = guestKey(event.id, email);
  const contact = await contactEmailFor(event);

  let already = false;
  try {
    const earlier = await queryItems<{ id: number }>('event_registrations', {
      filter: JSON.stringify({ _and: [{ event: { _eq: event.id } }, { guest_key: { _eq: key } }, { status: { _neq: 'cancelled' } }] }),
      fields: 'id',
      limit: '1',
    });
    already = earlier.length > 0;
  } catch (err) {
    // Without the check a second acceptance just adds a second row; still better than turning the guest away.
    console.warn('[chapters/register] invitation: could not check for an earlier acceptance', err);
  }

  if (!already) {
    const capacity = Number(event.capacity);
    if (capacity >= 1) {
      try {
        const confirmed = await queryItems<{ id: number }>('event_registrations', {
          filter: JSON.stringify({ _and: [{ event: { _eq: event.id } }, { kind: { _eq: 'invite' } }, { status: { _eq: 'confirmed' } }] }),
          fields: 'id',
          limit: '-1',
        });
        if (confirmed.length >= capacity) {
          return NextResponse.json(
            { error: `The guest list is full. Write to ${contact} and we’ll tell you if a place opens up.` },
            { status: 409 },
          );
        }
      } catch (err) {
        console.error('[chapters/register] invitation capacity check', err);
        return NextResponse.json({ error: 'We couldn’t check the guest list just now. Please try again shortly.' }, { status: 502 });
      }
    }

    try {
      await createItem('event_registrations', {
        event: event.id,
        kind: 'invite',
        status: 'confirmed',
        payment_status: 'not_required',
        guest_key: key,
        ...values,
        accepted_terms: true,
        marketing_opt_in: body.marketing_opt_in === true,
      });
    } catch (err) {
      console.error('[chapters/register] invitation', err);
      return NextResponse.json({ error: 'We couldn’t record that just now. Please try again shortly.' }, { status: 502 });
    }
  }

  const sent = await sendMail(invitationMail(event, { name: String(values.full_name), email }, contact));
  if (!already && teamInbox()) {
    await sendMail({
      to: teamInbox()!,
      replyTo: email,
      subject: `New guest (invitation link): ${event.title}`,
      text: `${summarise(
        { ...values, marketing_opt_in: body.marketing_opt_in === true ? 'yes' : 'no' },
        Object.fromEntries(fields.map((f) => [f.name, f.label])),
      )}\n\nInvitation email: ${sent ? 'sent' : 'NOT sent (no mail provider, or it failed). Please send it by hand.'}`,
    });
  }

  const message = already
    ? sent
      ? `You’re already on the guest list, so we’ve sent your invitation to ${email} again.`
      : 'You’re already on the guest list. The team will email you your invitation shortly.'
    : sent
      ? `Your invitation is on its way to ${email}. Check your inbox, and the spam folder just in case.`
      : 'You’re on the guest list. The team will email you your invitation shortly.';
  return NextResponse.json({ ok: true, message });
}

/** Places still free, or null when the event has no capacity set. */
async function placesLeft(event: ChapterEvent): Promise<number | null> {
  const left = await balance(event);
  return left === null ? null : Math.max(0, left);
}

/** Capacity minus the places taken or held; below zero when overbooked. Null: no limit. */
async function balance(event: ChapterEvent): Promise<number | null> {
  const capacity = Number(event.capacity);
  if (!capacity || capacity < 1) return null;

  const holdSince = new Date(Date.now() - HOLD_MINUTES * 60_000).toISOString();
  const rows = await queryItems<{ attendees: number | null }>('event_registrations', {
    filter: JSON.stringify({
      _and: [
        { event: { _eq: event.id } },
        { kind: { _eq: 'booking' } },
        {
          _or: [
            { status: { _in: ['received', 'confirmed'] } },
            { _and: [{ status: { _eq: 'awaiting_payment' } }, { date_created: { _gte: holdSince } }] },
          ],
        },
      ],
    }),
    fields: 'attendees',
    limit: '-1',
  });
  const taken = rows.reduce((sum, r) => sum + (Number(r.attendees) || 1), 0);
  return capacity - taken;
}
