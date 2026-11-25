#!/usr/bin/env node
/**
 * Checks the site's email settings from the server itself: reads .env.local
 * the way the site does, says which provider the site will use, and for SMTP
 * connects and signs in. Sends nothing unless asked.
 *
 *   node scripts/verify-mail.mjs                      sign-in check only
 *   node scripts/verify-mail.mjs --to=you@example.com  also sends one test email
 *
 * Run it in the site's folder (where .env.local is). The password is never
 * printed. A "$" in SMTP_PASSWORD must be written "\$" in .env.local, or the
 * site reads a shorter password; this check reads it exactly as the site does.
 */

import net from 'node:net';
import tls from 'node:tls';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const to = process.argv.find((a) => a.startsWith('--to='))?.slice(5);
const env = process.env;
const fail = (msg) => {
  console.error(`\n  x ${msg}\n`);
  process.exit(1);
};

console.log(`\n  Email settings in ${process.cwd()}/.env.local\n`);

const from = env.MAIL_FROM?.trim();
if (!from) fail('MAIL_FROM is empty: the site sends no email at all.');
const fromAddress = (/<([^>]+)>/.exec(from)?.[1] || from).trim();
console.log(`  MAIL_FROM          ${from}`);
console.log(`  TEAM_NOTIFY_EMAIL  ${env.TEAM_NOTIFY_EMAIL || '(empty: the team gets no notices)'}`);

if (env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET) {
  fail('MS_* is set, so the site sends through Microsoft 365, not SMTP. Clear MS_* to use SMTP.');
}
const host = env.SMTP_HOST?.trim();
const user = env.SMTP_USER?.trim();
const password = env.SMTP_PASSWORD;
if (!host || !user || !password) {
  fail(env.RESEND_API_KEY ? 'SMTP_* is incomplete, so the site sends through Resend.' : 'SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be set.');
}
const port = Number(env.SMTP_PORT) || 465;
const secure = env.SMTP_SECURE ? env.SMTP_SECURE.trim().toLowerCase() === 'true' : port === 465;
console.log(`  provider           SMTP ${host}:${port} (${secure ? 'TLS' : 'STARTTLS'})`);
console.log(`  SMTP_USER          ${user}`);
console.log(`  SMTP_PASSWORD      ${password.length} characters as the site reads it${password.includes('$') ? ' (contains $)' : ''}`);
if (user.toLowerCase() !== fromAddress.toLowerCase()) {
  console.log(`  ! MAIL_FROM (${fromAddress}) is not the SMTP mailbox (${user}); many servers refuse that.`);
}

/* A minimal SMTP conversation, the same steps the site takes. */
let socket = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
let buffer = '';
let pending = null;
const replies = [];
function listen(s) {
  s.setTimeout(20000, () => done(new Error('the mail server stopped answering')));
  s.on('error', (e) => done(e));
  s.on('data', (d) => {
    buffer += d.toString();
    const lines = [];
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end).replace(/\r$/, '');
      buffer = buffer.slice(end + 1);
      lines.push(line);
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), text: lines.splice(0).join(' | ') };
        if (pending) {
          const p = pending;
          pending = null;
          p.resolve(reply);
        } else replies.push(reply);
      }
    }
  });
}
function done(err) {
  if (pending) {
    const p = pending;
    pending = null;
    p.reject(err);
  } else if (err) {
    fail(`connection: ${err.message}`);
  }
}
const read = () => (replies.length ? Promise.resolve(replies.shift()) : new Promise((resolve, reject) => (pending = { resolve, reject })));
async function cmd(line, ok, shown = line) {
  socket.write(`${line}\r\n`);
  const r = await read();
  if (!ok.includes(r.code)) throw new Error(`${shown} -> ${r.code} ${r.text.slice(0, 200)}`);
  return r;
}

listen(socket);
try {
  const hello = await read();
  console.log(`\n  ✓ connected: ${hello.text.slice(0, 80)}`);
  let ehlo = await cmd(`EHLO ${fromAddress.split('@')[1] || 'localhost'}`, [250]);
  if (!secure) {
    if (!/STARTTLS/i.test(ehlo.text)) throw new Error('the server offers no STARTTLS, so the password would go unencrypted. Use port 465.');
    await cmd('STARTTLS', [220]);
    socket.removeAllListeners();
    socket = tls.connect({ socket, servername: host });
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    listen(socket);
    ehlo = await cmd(`EHLO ${fromAddress.split('@')[1] || 'localhost'}`, [250]);
  }
  console.log(`  ✓ encrypted (certificate for ${socket.getPeerCertificate().subject?.CN || host} is valid)`);
  if (/AUTH[ =][^|]*PLAIN/i.test(ehlo.text) || !/AUTH[ =][^|]*LOGIN/i.test(ehlo.text)) {
    await cmd(`AUTH PLAIN ${Buffer.from(`\0${user}\0${password}`).toString('base64')}`, [235], 'AUTH PLAIN');
  } else {
    await cmd('AUTH LOGIN', [334]);
    await cmd(Buffer.from(user).toString('base64'), [334], 'AUTH LOGIN (user)');
    await cmd(Buffer.from(password).toString('base64'), [235], 'AUTH LOGIN (password)');
  }
  console.log(`  ✓ signed in as ${user}`);

  if (to) {
    await cmd(`MAIL FROM:<${fromAddress}>`, [250]);
    await cmd(`RCPT TO:<${to}>`, [250, 251]);
    await cmd('DATA', [354]);
    const body = [
      `From: ${from}`,
      `To: <${to}>`,
      'Subject: AntiSocialTalks mail test',
      `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${randomUUID()}@${fromAddress.split('@')[1]}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'This is a test from scripts/verify-mail.mjs. If you can read it, the website can send email.',
      '',
    ].join('\r\n');
    const queued = await cmd(`${body}\r\n.`, [250], 'DATA (message)');
    console.log(`  ✓ test email accepted for ${to} (${queued.text.slice(4, 80)})`);
    console.log('    Check that inbox, and the spam folder.');
  } else {
    console.log('\n  Nothing sent. Add --to=you@example.com to send one test email.');
  }
  socket.write('QUIT\r\n');
  socket.end();
  console.log('\n  Done. Restart the site (pm2 restart ...) after any change to .env.local.\n');
  process.exit(0);
} catch (err) {
  const hint = /535|authentication/i.test(err.message)
    ? '\n    The password was refused. If it contains "$", write it as "\\$" in .env.local.'
    : '';
  fail(`${err.message}${hint}`);
}
