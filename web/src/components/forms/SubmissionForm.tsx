'use client';

import { useState } from 'react';
import { Honeypot } from '@/components/chapters/FormField';
import { postApi } from '@/lib/api-client';
import type { SubmissionType } from '@/lib/community';

export type { SubmissionType };

const field =
  'w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-mute/50 transition focus:border-sand focus:outline-none focus:ring-2 focus:ring-sand/25';

/**
 * The one form behind all five community CTAs. Every submission lands in the
 * Directus `submissions` collection tagged with `type`, so the team can filter
 * them in the dashboard without five separate inboxes.
 */
export function SubmissionForm({
  type,
  messageLabel,
  messagePlaceholder,
  showInterest = false,
  submitLabel = 'Send',
}: {
  type: SubmissionType;
  messageLabel: string;
  messagePlaceholder: string;
  showInterest?: boolean;
  submitLabel?: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setState('sending');
    try {
      await postApi('/api/submissions', {
        type,
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        message: String(data.get('message') || '').trim(),
        interest: showInterest ? String(data.get('interest') || '') : undefined,
        consent_email: data.get('consent_email') === 'on',
        website: data.get('website') || undefined,
      });
      setState('done');
      setFeedback('We read every single one. Someone will be in touch.');
      form.reset();
    } catch (err) {
      setState('error');
      setFeedback(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-3xl border border-sand/40 bg-sand/10 px-8 py-12 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-sand">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0b0b0c" strokeWidth="2.5" className="h-5 w-5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-semibold">Received.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-mute">{feedback}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${type}-name`} className="eyebrow mb-2 block text-ink-mute">
            Your name
          </label>
          <input
            id={`${type}-name`}
            name="name"
            required
            autoComplete="name"
            className={field}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label htmlFor={`${type}-email`} className="eyebrow mb-2 block text-ink-mute">
            Email
          </label>
          <input
            id={`${type}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
            placeholder="you@example.com"
          />
        </div>
      </div>

      {showInterest && (
        <div>
          <label htmlFor={`${type}-interest`} className="eyebrow mb-2 block text-ink-mute">
            Where you would like to appear
          </label>
          <select id={`${type}-interest`} name="interest" className={field} defaultValue="podcast">
            <option value="podcast">The podcast</option>
            <option value="chapter">A live chapter talk</option>
            <option value="both">Both</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor={`${type}-message`} className="eyebrow mb-2 block text-ink-mute">
          {messageLabel}
        </label>
        <textarea
          id={`${type}-message`}
          name="message"
          required
          rows={6}
          className={`${field} resize-y`}
          placeholder={messagePlaceholder}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-ink-mute">
        <input
          type="checkbox"
          name="consent_email"
          defaultChecked
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/25 accent-[#c8a67f]"
        />
        <span>
          It is fine to email me about AntiSocialTalks. No spam, and you can opt out any time.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="inline-flex h-11 items-center rounded-full bg-ink px-7 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-ink-soft disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending' : submitLabel}
        </button>
        {state === 'error' && (
          <p aria-live="polite" className="text-sm text-red-600">
            {feedback}
          </p>
        )}
      </div>
    </form>
  );
}
