'use client';

import { useState } from 'react';
import { LEGAL, MAX_PER_BOOKING, formatPrice, registrationFields, type FormMode, type TicketPrice } from '@/lib/chapters';
import { postApi } from '@/lib/api-client';
import { Confirmation, FormField, Honeypot } from './FormField';

/**
 * Register for one event. What it means depends on the event's status
 * (`mode`): interest-only before details are confirmed, a booking request when
 * registration is open, or a waitlist entry when it's full. The page only
 * renders this for modes that accept registrations.
 *
 * A status can replace the opening note (`note`; an empty string leaves it out,
 * when the page already says what happens next) and the button (`submitLabel`),
 * e.g. an early-bird list.
 *
 * With an `invite` code, the guest is accepting a private invitation link:
 * they go straight on the guest list and are emailed their invitation.
 *
 * With a `price`, a booking is paid: the server holds the places and returns
 * a Stripe payment page, and the place is confirmed once the payment clears.
 */
export function RegistrationForm({
  eventSlug,
  mode,
  price = null,
  note,
  submitLabel,
  invite,
  doneTitle,
}: {
  eventSlug: string;
  mode: FormMode;
  price?: TicketPrice | null;
  note?: string;
  submitLabel?: string;
  invite?: string;
  doneTitle?: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [places, setPlaces] = useState(1);
  const paid = mode === 'booking' && price !== null;

  const fields = registrationFields(mode);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { event: eventSlug, website: data.get('website') };
    if (invite) payload.invite = invite;
    for (const f of fields) payload[f.name] = data.get(f.name);
    payload.accepted_terms = data.get('accepted_terms') === 'on';
    payload.marketing_opt_in = data.get('marketing_opt_in') === 'on';

    setState('sending');
    try {
      const body = await postApi('/api/chapters/register', payload);

      // Paid booking: pay on Stripe's page, which comes back to /payment/complete.
      if (body.payment) {
        window.location.assign(body.payment.url);
        return;
      }
      setMessage(body.message);
      setState('done');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  if (state === 'done') {
    const title =
      doneTitle ??
      (mode === 'waitlist' ? 'You’re on the waitlist.' : mode === 'booking' ? 'You’re booked.' : mode === 'rsvp' ? 'Your RSVP is in.' : 'You’re on the list.');
    return <Confirmation title={title} message={message} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      <Honeypot />

      {note && (
        <p className="rounded-2xl border border-sand/40 bg-sand/10 px-5 py-4 text-sm leading-relaxed text-ink">{note}</p>
      )}
      {note === undefined && mode === 'interest' && (
        <p className="rounded-2xl border border-sand/40 bg-sand/10 px-5 py-4 text-sm leading-relaxed text-ink">
          Register your interest to receive event updates. This does not confirm a seat or issue a ticket.
        </p>
      )}
      {mode === 'waitlist' && (
        <p className="rounded-2xl border border-ink/15 bg-white px-5 py-4 text-sm leading-relaxed text-ink">
          This event is full. Join the waitlist and we’ll email you if a place opens up.
        </p>
      )}
      {note === undefined && mode === 'rsvp' && (
        <p className="rounded-2xl border border-sand/40 bg-sand/10 px-5 py-4 text-sm leading-relaxed text-ink">
          By invitation. Places are limited, and the team reviews every RSVP. Once yours is confirmed, we email you the
          venue and the details.
        </p>
      )}

      {paid && price && (
        <p className="rounded-2xl border border-sand/40 bg-sand/10 px-5 py-4 text-sm leading-relaxed text-ink">
          Tickets are {formatPrice(price)} per person. You pay securely through Stripe, and your place is confirmed
          as soon as the payment clears.
        </p>
      )}

      <div
        className="grid gap-4 sm:grid-cols-2"
        onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === 'attendees') setPlaces(Math.max(1, Math.floor(Number(t.value)) || 1));
        }}
      >
        {fields.map((f) => (
          <FormField key={f.name} field={f} idPrefix={`reg-${eventSlug}`} />
        ))}
      </div>

      <label className="flex items-start gap-3 text-sm text-ink-mute">
        <input type="checkbox" name="accepted_terms" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#c8a67f]" />
        <span>
          I accept the{' '}
          <a href={LEGAL.eventTerms} target="_blank" className="link-underline font-semibold text-ink">
            event terms
          </a>{' '}
          and{' '}
          <a href={LEGAL.privacy} target="_blank" className="link-underline font-semibold text-ink">
            Privacy Policy
          </a>
          . <span className="text-sand-deep">*</span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink-mute">
        <input type="checkbox" name="marketing_opt_in" className="mt-0.5 h-4 w-4 shrink-0 accent-[#c8a67f]" />
        <span>Send me AntiSocialTalks community and event updates (optional). You can unsubscribe at any time.</span>
      </label>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="inline-flex h-11 items-center rounded-full bg-ink px-7 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-ink-soft disabled:opacity-60"
        >
          {state === 'sending'
            ? 'Sending…'
            : paid && price
              ? `Pay ${formatPrice({ amount: price.amount * Math.min(places, MAX_PER_BOOKING), currency: price.currency })} and Book`
              : submitLabel
                ? submitLabel
                : mode === 'waitlist'
                ? 'Join the Waitlist'
                : mode === 'rsvp'
                  ? 'Send My RSVP'
                  : 'Register for the Event'}
        </button>
        {state === 'error' && (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
