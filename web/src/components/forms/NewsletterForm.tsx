'use client';

import { useState } from 'react';
import { Honeypot } from '@/components/chapters/FormField';
import { postApi } from '@/lib/api-client';

export function NewsletterForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    if (!email) return;

    setState('sending');
    try {
      await postApi('/api/submissions', {
        type: 'community',
        email,
        consent_email: true,
        message: 'Newsletter signup from the site footer.',
        website: data.get('website') || undefined,
      });
      setState('done');
      setMessage('You’re subscribed.');
      form.reset();
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative">
      <Honeypot />
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor="footer-email" className="sr-only">
          Email address
        </label>
        <input
          id="footer-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className="h-11 min-w-0 shrink-0 rounded-full border border-white/20 bg-white/5 px-5 sm:flex-1 sm:shrink text-sm text-white placeholder:text-white/35 transition focus:border-sand focus:bg-white/10 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="h-11 shrink-0 rounded-full bg-sand px-6 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-sand-light disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending' : 'Subscribe'}
        </button>
      </div>
      <p aria-live="polite" className={`mt-3 text-xs ${state === 'error' ? 'text-red-300' : 'text-white/45'}`}>
        {message || 'Everyone has a voice. Most never use it.'}
      </p>
    </form>
  );
}
