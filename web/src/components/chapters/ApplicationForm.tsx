'use client';

import { useState } from 'react';
import { APPLICATIONS, LEGAL, PROPOSAL_UPLOAD, type ApplicationType } from '@/lib/chapters';
import { postApi } from '@/lib/api-client';
import { Confirmation, FormField, Honeypot, fieldClass } from './FormField';

/**
 * Organiser proposal, speaker pitch, local-team volunteer or chapter partner —
 * one form, configured by `type` from lib/chapters.ts. Sent as multipart so
 * organisers can attach a proposal document.
 */
export function ApplicationForm({ type }: { type: ApplicationType }) {
  const config = APPLICATIONS[type];
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('type', type);

    const file = data.get('attachment');
    if (file instanceof File && file.size > PROPOSAL_UPLOAD.maxBytes) {
      setMessage('The proposal file is larger than 10 MB.');
      setState('error');
      return;
    }

    setState('sending');
    try {
      const body = await postApi('/api/chapters/apply', data);
      setMessage(body.message);
      setState('done');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  if (state === 'done') {
    return <Confirmation title={type === 'organiser' ? 'Your idea is in.' : 'Received.'} message={message} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      <Honeypot />

      <div className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((f) => (
          <FormField key={f.name} field={f} idPrefix={`app-${type}`} />
        ))}

        {config.allowsUpload && (
          <div className="sm:col-span-2">
            <label htmlFor={`app-${type}-attachment`} className="eyebrow mb-2 block text-ink-mute">
              Proposal document (optional)
            </label>
            <input
              id={`app-${type}-attachment`}
              type="file"
              name="attachment"
              accept={PROPOSAL_UPLOAD.accept}
              className={`${fieldClass} file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
            />
            <p className="mt-1.5 text-xs text-ink-mute">PDF, Word or PowerPoint, up to 10 MB.</p>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-ink-mute">
        <input type="checkbox" name="accepted_privacy" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#c8a67f]" />
        <span>
          I have read the{' '}
          <a href={LEGAL.privacy} target="_blank" className="link-underline font-semibold text-ink">
            Privacy Policy
          </a>
          . <span className="text-sand-deep">*</span>
        </span>
      </label>

      {config.reviewNote && (
        <label className="flex items-start gap-3 text-sm text-ink-mute">
          <input type="checkbox" name="accepted_review" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#c8a67f]" />
          <span>
            {config.reviewNote}{' '}
            {/* Starting a chapter or organising an event comes under the Chapter Partner Program clause. */}
            <a href={type === 'speaker' ? LEGAL.terms : LEGAL.chapterTerms} target="_blank" className="link-underline font-semibold text-ink">
              {type === 'speaker' ? 'Terms of Use' : 'Chapter Partner Program terms'}
            </a>
            . <span className="text-sand-deep">*</span>
          </span>
        </label>
      )}

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
          {state === 'sending' ? 'Sending…' : config.submitLabel}
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
