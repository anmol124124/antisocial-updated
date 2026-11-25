import 'server-only';
import { createHash } from 'node:crypto';
import { siteHost, siteUrl } from './env';
import { eventPlace, eventWhen, textLines } from './chapters';
import { eventSlug, type ChapterEvent } from './content';
import type { Mail } from './mailer';

/**
 * Private invitations: a guest who accepts through an event's invitation link
 * (/invite/<code>) is emailed their invitation straight away, with the venue
 * the CMS keeps for invited guests only and a calendar entry.
 */

/**
 * Stands in for the guest's email when checking whether they already
 * accepted, so the site never needs to read anyone's email address back.
 */
export function guestKey(eventId: number, email: string): string {
  return createHash('sha256').update(`${eventId}:${email.trim().toLowerCase()}`).digest('hex').slice(0, 40);
}

const html = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "20261103T113000Z" */
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** "20261103" for the day the event falls on in its own timezone, plus `days`. */
function localDay(d: Date, timeZone: string, days = 0): string {
  let ymd: string;
  try {
    ymd = d.toLocaleDateString('en-CA', { timeZone });
  } catch {
    ymd = d.toISOString().slice(0, 10);
  }
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day + days)).toISOString().slice(0, 10).replace(/-/g, '');
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Calendar lines are at most 75 bytes; longer ones carry on after a space. */
function fold(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > 73) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

/**
 * The calendar entry (.ics) sent with an invitation, or null while the date
 * isn't set. A date whose time is still to be announced is an all-day entry;
 * an event with no end time is entered as two hours.
 */
export function calendarFile(event: ChapterEvent): string | null {
  if (!event.starts_at) return null;
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return null;
  const zone = event.timezone || 'UTC';

  let when: string[];
  if (event.time_tba) {
    when = [`DTSTART;VALUE=DATE:${localDay(start, zone)}`, `DTEND;VALUE=DATE:${localDay(start, zone, 1)}`];
  } else {
    const end = event.ends_at ? new Date(event.ends_at) : null;
    const finish = end && !Number.isNaN(end.getTime()) && end > start ? end : new Date(start.getTime() + 2 * 3600_000);
    when = [`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(finish)}`];
  }

  const link = `${siteUrl()}/events/${eventSlug(event)}`;
  const place = event.invite_venue?.trim() || eventPlace(event);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AntiSocialTalks//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${event.id}-${eventSlug(event)}@${siteHost()}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    ...when,
    `SUMMARY:${icsText(event.title)}`,
    ...(place ? [`LOCATION:${icsText(place)}`] : []),
    `DESCRIPTION:${icsText([event.theme, link].filter(Boolean).join('\n'))}`,
    `URL:${link}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** The invitation email for one guest who accepted. `contact`: who they can write to (contactEmailFor). */
export function invitationMail(event: ChapterEvent, guest: { name: string; email: string }, contact: string): Mail {
  const when = eventWhen(event);
  const place = eventPlace(event);
  const venue = event.invite_venue?.trim() || null;
  const note = textLines(event.invite_message);
  const link = `${siteUrl()}/events/${eventSlug(event)}`;
  const calendar = calendarFile(event);
  const first = guest.name.trim().split(/\s+/)[0] || guest.name;

  const rows: [string, string][] = [
    ['Event', event.title],
    ['Date', when?.date || 'To be announced'],
    ['Time', when?.time ? `${when.time} (local time)` : 'To be announced'],
    ['Where', venue || `${place ? `${place}. ` : ''}We’ll email you the venue before the day.`],
  ];

  const text = [
    `Hi ${first},`,
    '',
    `You’re invited. Your place at ${event.title} is confirmed.`,
    ...(event.theme ? ['', event.theme] : []),
    '',
    ...rows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ', ')}`),
    ...(note ? ['', ...note] : []),
    '',
    ...(calendar ? ['A calendar entry is attached, so the date is in your diary.', ''] : []),
    `Questions? Just reply to this email or write to ${contact}.`,
    '',
    `The event: ${link}`,
    '',
    'See you there,',
    'The AntiSocialTalks team',
  ].join('\n');

  const poster = event.image
    ? `${siteUrl()}/api/assets/${event.image}?width=1120&height=1120&fit=cover&format=jpg&quality=82`
    : null;
  const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(`You’re invited: ${event.title}`)}</title></head>
<body style="margin:0;padding:0;background:#f3efe7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;${font}color:#0b0b0c;">
<tr><td style="background:#0b0b0c;padding:28px 32px 32px;color:#ffffff;">
<div style="font-size:17px;font-weight:800;letter-spacing:-0.02em;">AntiSocial<span style="font-weight:400;">Talks</span></div>
<div style="margin-top:32px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#c8a67f;">Private invitation</div>
<div style="margin-top:10px;font-size:36px;font-weight:800;line-height:1.05;letter-spacing:-0.03em;">You’re invited.</div>
<div style="margin-top:12px;font-size:17px;font-weight:700;">${html(event.title)}</div>
${event.theme ? `<div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;line-height:1.35;color:#c8a67f;">${html(event.theme)}</div>` : ''}
</td></tr>
${poster ? `<tr><td style="background:#0b0b0c;"><img src="${html(poster)}" width="560" alt="${html(`${event.title} poster`)}" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></td></tr>` : ''}
<tr><td style="padding:30px 32px 8px;">
<p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Hi ${html(first)},</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.55;">Your place at <strong>${html(event.title)}</strong> is confirmed. Here is everything you need.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e2d8;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:12px 12px 12px 0;border-bottom:1px solid #e7e2d8;width:84px;vertical-align:top;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8478;">${html(k)}</td><td style="padding:12px 0;border-bottom:1px solid #e7e2d8;font-size:15px;font-weight:600;line-height:1.5;">${v
        .split('\n')
        .map(html)
        .join('<br>')}</td></tr>`,
  )
  .join('\n')}
</table>
${note ? `<div style="margin-top:22px;padding:16px 18px;border-radius:14px;background:#f8f1e7;border:1px solid #ead9c2;font-size:14px;line-height:1.6;">${note.map(html).join('<br>')}</div>` : ''}
${calendar ? '<p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#5f5a52;">A calendar entry is attached, so the date is in your diary.</p>' : ''}
<p style="margin:26px 0 0;"><a href="${html(link)}" style="display:inline-block;background:#0b0b0c;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;padding:14px 24px;border-radius:999px;">See the event</a></p>
<p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#5f5a52;">Questions? Just reply to this email or write to <a href="mailto:${html(contact)}" style="color:#0b0b0c;">${html(contact)}</a>.</p>
<p style="margin:22px 0 30px;font-size:15px;line-height:1.55;">See you there,<br><strong>The AntiSocialTalks team</strong></p>
</td></tr>
<tr><td style="background:#0b0b0c;padding:20px 32px;font-size:13px;color:#ffffff;"><span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#c8a67f;">Not anti-society. Anti-silence.</span></td></tr>
</table>
<p style="margin:16px 0 0;${font}font-size:12px;color:#8a8478;">This invitation was sent to ${html(guest.email)} because you accepted it on ${html(new URL(siteUrl()).host)}.</p>
</td></tr>
</table>
</body></html>`;

  return {
    to: guest.email,
    replyTo: contact,
    subject: `You’re invited: ${event.title}`,
    text,
    html: body,
    attachments: calendar
      ? [{ name: `${eventSlug(event)}.ics`, contentType: 'text/calendar; charset=utf-8; method=PUBLISH', content: Buffer.from(calendar).toString('base64') }]
      : [],
  };
}
