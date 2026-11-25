// The SMTP client (src/lib/smtp.ts) against a stand-in mail server on this
// machine (tests/support/smtp-server.mjs): TLS from the start, STARTTLS, and
// the ways it must refuse to send.

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CERT, readMessage, startSmtp } from '../support/smtp-server.mjs';
import { captureConsole, setEnv } from '../support/mocks.mjs';

const { sendSmtp, smtpConfig, buildMessage, SmtpError } = await import('@/lib/smtp');
const { sendMail } = await import('@/lib/mailer');

const USER = 'noreply@antisocialtalks.com';
const PASSWORD = 'pa$$&word';
const FROM = { name: 'AntiSocialTalks', address: USER };
const MESSAGE = {
  from: FROM,
  to: 'ada@example.com',
  replyTo: 'admin@antisocialtalks.com',
  subject: 'You’re invited: AntiSocialTalks London',
  text: 'Hi Ada,\n.\nA line that starts with a dot.',
  html: '<p>Hi Ada, you’re invited.</p>',
  attachments: [{ name: 'london-2026.ics', contentType: 'text/calendar; charset=utf-8; method=PUBLISH', content: Buffer.from('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n').toString('base64') }],
};
const trust = { tlsOptions: { ca: CERT } };

let server;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

const config = (extra = {}) => ({ host: 'localhost', port: server.port, secure: true, user: USER, password: PASSWORD, ...extra });

describe('SMTP', () => {
  test('TLS from the start (port 465): signs in and hands over the whole message', async () => {
    server = await startSmtp({ mode: 'tls' });
    await sendSmtp(config(), MESSAGE, trust);

    const [mail] = server.accepted;
    assert.deepEqual([mail.from, mail.to], [USER, ['ada@example.com']]);
    const m = readMessage(mail.data);
    assert.equal(m.subject, 'You’re invited: AntiSocialTalks London');
    assert.equal(m.headers.from, '"AntiSocialTalks" <noreply@antisocialtalks.com>');
    assert.equal(m.headers['reply-to'], '<admin@antisocialtalks.com>');
    assert.match(m.headers['message-id'], /^<[0-9a-f-]+@antisocialtalks\.com>$/);
    assert.match(m.headers.date, /\+0000$/);

    const [text, html, ics] = m.parts;
    assert.match(text.type, /^text\/plain; charset=utf-8/);
    assert.equal(text.text, MESSAGE.text);
    assert.match(html.type, /^text\/html/);
    assert.equal(html.text, MESSAGE.html);
    assert.match(ics.type, /^text\/calendar; charset=utf-8; method=PUBLISH; name="london-2026.ics"/);
    assert.match(ics.disposition, /attachment; filename="london-2026.ics"/);
    assert.equal(ics.base64, MESSAGE.attachments[0].content);
    assert.ok(mail.data.split('\r\n').every((l) => l.length <= 998), 'no line over the SMTP limit');
  });

  test('STARTTLS (port 587): the password is only sent after the upgrade', async () => {
    server = await startSmtp({ mode: 'starttls' });
    await sendSmtp(config({ secure: false }), MESSAGE, trust);
    assert.equal(server.accepted.length, 1);
    assert.ok(server.sessions.every((s) => !s.plaintextPassword));
    assert.deepEqual(server.sessions[0].commands, ['EHLO', 'STARTTLS']);
    assert.ok(server.sessions[1].commands.includes('AUTH PLAIN'));
  });

  test('AUTH LOGIN when that is all the server offers', async () => {
    server = await startSmtp({ mode: 'tls', auth: 'LOGIN' });
    await sendSmtp(config(), { ...MESSAGE, html: undefined, attachments: [] }, trust);
    const [mail] = server.accepted;
    const m = readMessage(mail.data);
    assert.equal(m.parts.length, 1);
    assert.equal(m.parts[0].text, MESSAGE.text);
    assert.ok(server.sessions[0].commands.includes('AUTH LOGIN'));
  });

  test('a server without TLS never gets the password', async () => {
    server = await startSmtp({ mode: 'plain' });
    await assert.rejects(sendSmtp(config({ secure: false }), MESSAGE, trust), /does not offer STARTTLS/);
    assert.ok(!server.sessions[0].commands.some((c) => c.startsWith('AUTH')));
    assert.equal(server.accepted.length, 0);
  });

  test('a wrong password stops before anything is sent, and the error never shows it', async () => {
    server = await startSmtp({ mode: 'tls' });
    const err = await sendSmtp(config({ password: 'nope' }), MESSAGE, trust).catch((e) => e);
    assert.ok(err instanceof SmtpError);
    assert.equal(err.code, 535);
    assert.ok(!err.message.includes('nope') && !err.message.includes(Buffer.from('\0' + USER + '\0nope').toString('base64')));
    assert.ok(!server.sessions[0].commands.includes('MAIL'));
  });

  test('an untrusted certificate is refused', async () => {
    server = await startSmtp({ mode: 'tls' });
    await assert.rejects(sendSmtp(config(), MESSAGE), (e) => /certificate/i.test(e.message) || /SELF_SIGNED|UNABLE_TO_VERIFY/.test(e.code));
    assert.equal(server.accepted.length, 0);
  });

  test('long non-English subjects are split into encoded words; header injection is not possible', () => {
    const raw = buildMessage({ ...MESSAGE, subject: 'Ваше приглашение на AntiSocialTalks London: ждём вас ’ скоро', to: 'ada@example.com>\r\nBcc: <x@evil.test' });
    const head = raw.split('\r\n\r\n')[0];
    for (const word of head.match(/=\?UTF-8\?B\?[^?]*\?=/g)) assert.ok(word.length <= 75, `encoded word too long: ${word.length}`);
    assert.equal(readMessage(raw).subject, 'Ваше приглашение на AntiSocialTalks London: ждём вас ’ скоро');
    assert.ok(!/^Bcc:/m.test(head), 'a crafted address must not add a header');
  });

  test('settings: 465 means TLS from the start, 587 STARTTLS, SMTP_SECURE overrides; incomplete means off', () => {
    const base = { SMTP_HOST: 'mx.example.com', SMTP_USER: USER, SMTP_PASSWORD: PASSWORD };
    assert.deepEqual(smtpConfig(base), { host: 'mx.example.com', port: 465, secure: true, user: USER, password: PASSWORD });
    assert.equal(smtpConfig({ ...base, SMTP_PORT: '587' }).secure, false);
    assert.equal(smtpConfig({ ...base, SMTP_PORT: '2525', SMTP_SECURE: 'true' }).secure, true);
    assert.equal(smtpConfig({ ...base, SMTP_PASSWORD: '' }), null);
  });
});

describe('sendMail over SMTP', () => {
  let logs;
  afterEach(() => logs?.restore());

  test('is used when SMTP is set and Microsoft is not; a failure is logged, never thrown', async () => {
    server = await startSmtp({ mode: 'plain' });
    setEnv({ MAIL_FROM: 'AntiSocialTalks <noreply@antisocialtalks.com>', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(server.port), SMTP_SECURE: 'false', SMTP_USER: USER, SMTP_PASSWORD: PASSWORD });
    logs = captureConsole();
    assert.equal(await sendMail({ to: 'ada@example.com', subject: 'Hello', text: 'Body' }), false);
    assert.equal(server.sessions.length, 1, 'the SMTP server was asked');
    assert.ok(logs.lines.some((l) => /smtp could not send "Hello".*STARTTLS/.test(l)));
    assert.ok(!logs.lines.join(' ').includes(PASSWORD));
  });
});
