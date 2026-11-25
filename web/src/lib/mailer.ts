import 'server-only';
import { sendSmtp, smtpConfig } from './smtp';

/**
 * Transactional email: form acknowledgements, booking and order
 * confirmations, and the team's notifications.
 *
 * Three providers, none needing an SDK:
 *
 *   Microsoft 365 (Outlook), via Microsoft Graph. Used when MS_TENANT_ID is set.
 *     MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  from an Entra app registration
 *       with the Mail.Send application permission (admin consent granted)
 *     MAIL_FROM  the mailbox to send as, e.g. "AntiSocialTalks <admin@antisocialtalks.com>"
 *
 *   An SMTP mailbox (lib/smtp), used when SMTP_HOST is set instead.
 *     SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASSWORD; MAIL_FROM should be
 *     that mailbox. A "$" in the password is written "\$" in .env.local.
 *
 *   Resend, used when RESEND_API_KEY is set instead.
 *
 *   TEAM_NOTIFY_EMAIL  where new registrations, applications and orders are announced
 *
 * With neither configured, sending is skipped and logged. The record is
 * already safe in Directus by the time mail goes out, so a missing or failing
 * provider never fails the visitor's request.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  /** A designed version; mail apps that show HTML use it instead of `text`. */
  html?: string;
  replyTo?: string;
  /** Files sent with the mail, e.g. a calendar entry. `content` is base64. */
  attachments?: { name: string; contentType: string; content: string }[];
};

type Provider = 'graph' | 'smtp' | 'resend' | null;

function provider(): Provider {
  if (!process.env.MAIL_FROM) return null;
  if (process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET) return 'graph';
  if (smtpConfig()) return 'smtp';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

let warned = false;

/** Returns whether the mail was handed to the provider. Never throws. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const via = provider();
  if (!via) {
    if (!warned) {
      warned = true;
      console.warn('[mail] no mail provider set (MS_*, SMTP_* or RESEND_API_KEY, plus MAIL_FROM): emails are skipped.');
    }
    return false;
  }

  try {
    if (via === 'smtp') {
      await sendSmtp(smtpConfig()!, { ...mail, from: parseFrom(process.env.MAIL_FROM!) });
      return true;
    }
    const res = via === 'graph' ? await sendViaGraph(mail) : await sendViaResend(mail);
    if (!res.ok) {
      console.error(`[mail] ${via} rejected "${mail.subject}" (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[mail] ${via} could not send "${mail.subject}":`, err instanceof Error ? err.message : err);
    return false;
  }
}

/** "AntiSocialTalks <admin@x.com>" -> { name, address } */
function parseFrom(from: string): { name?: string; address: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, address: m[2] } : { address: from.trim() };
}

/* ───────────────────────── Microsoft Graph ───────────────────────── */

let graphToken: { value: string; expires: number } | null = null;

async function graphAccessToken(): Promise<string> {
  if (graphToken && graphToken.expires > Date.now() + 60_000) return graphToken.value;

  const res = await fetch(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID!,
      client_secret: process.env.MS_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; error_description?: string } | null;
  if (!res.ok || !body?.access_token) {
    throw new Error(`Microsoft sign-in failed (${res.status}): ${body?.error_description?.split('\n')[0] || 'no token'}`);
  }
  graphToken = { value: body.access_token, expires: Date.now() + (body.expires_in || 3600) * 1000 };
  return graphToken.value;
}

async function sendViaGraph(mail: Mail): Promise<Response> {
  const from = parseFrom(process.env.MAIL_FROM!);
  const token = await graphAccessToken();
  return fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from.address)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: mail.subject,
        // Graph takes one body, so the designed version wins when there is one.
        body: mail.html ? { contentType: 'HTML', content: mail.html } : { contentType: 'Text', content: mail.text },
        from: { emailAddress: from },
        toRecipients: [{ emailAddress: { address: mail.to } }],
        ...(mail.replyTo ? { replyTo: [{ emailAddress: { address: mail.replyTo } }] } : {}),
        ...(mail.attachments?.length
          ? {
              attachments: mail.attachments.map((a) => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: a.name,
                contentType: a.contentType,
                contentBytes: a.content,
              })),
            }
          : {}),
      },
      saveToSentItems: true,
    }),
    cache: 'no-store',
  });
}

/* ───────────────────────────── Resend ───────────────────────────── */

function sendViaResend(mail: Mail): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      ...(mail.attachments?.length
        ? { attachments: mail.attachments.map((a) => ({ filename: a.name, content: a.content, content_type: a.contentType })) }
        : {}),
    }),
    cache: 'no-store',
  });
}

/* ───────────────────────────── helpers ───────────────────────────── */

/** Plain-text summary of submitted fields, for the team's notification. */
export function summarise(values: Record<string, unknown>, labels: Record<string, string>): string {
  return Object.entries(values)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${labels[k] || k}: ${v}`)
    .join('\n');
}

export function teamInbox(): string | null {
  return process.env.TEAM_NOTIFY_EMAIL || null;
}
