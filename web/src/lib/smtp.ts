import net from 'node:net';
import tls from 'node:tls';
import { randomUUID } from 'node:crypto';

/**
 * A small SMTP client for the mailer, with no dependencies: one message per
 * connection, which is all the site sends (a form acknowledgement, an
 * invitation, a team notice).
 *
 *   SMTP_HOST, SMTP_USER, SMTP_PASSWORD
 *   SMTP_PORT    465 (TLS from the start, the default) or 587 (STARTTLS)
 *   SMTP_SECURE  "true" / "false" to override what the port implies
 *
 * The password is only ever sent over TLS: on a plain connection the server
 * must offer STARTTLS, or nothing is sent. Bodies go out base64-encoded, so
 * no line is too long and none starts with a dot.
 */

export type SmtpConfig = { host: string; port: number; secure: boolean; user: string; password: string };

export type SmtpMessage = {
  from: { name?: string; address: string };
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { name: string; contentType: string; content: string }[];
};

export function smtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  if (!host || !user || !password) return null;
  const port = Number(env.SMTP_PORT) || 465;
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE.trim().toLowerCase() === 'true' : port === 465;
  return { host, port, secure, user, password };
}

export class SmtpError extends Error {
  readonly code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

/* ───────────────────────────── the message ───────────────────────────── */

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const wrap = (base64: string) => base64.replace(/.{1,76}/g, '$&\r\n').trimEnd();

/** A header value in plain ASCII, or as UTF-8 encoded words of at most 75 characters each. */
function headerText(value: string): string {
  const clean = value.replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  const words: string[] = [];
  let chunk = '';
  for (const ch of clean) {
    if (Buffer.byteLength(chunk + ch) > 45) {
      words.push(`=?UTF-8?B?${b64(chunk)}?=`);
      chunk = '';
    }
    chunk += ch;
  }
  if (chunk) words.push(`=?UTF-8?B?${b64(chunk)}?=`);
  return words.join('\r\n ');
}

const address = (a: string) => `<${a.replace(/[<>\r\n\s]/g, '')}>`;

function mailbox(m: { name?: string; address: string }): string {
  if (!m.name) return address(m.address);
  const name = /^[\x20-\x7e]*$/.test(m.name) ? `"${m.name.replace(/["\\]/g, '')}"` : headerText(m.name);
  return `${name} ${address(m.address)}`;
}

/** The whole message as sent after DATA: headers, then text and HTML as alternatives, then any attachments. */
export function buildMessage(m: SmtpMessage, now = new Date()): string {
  const domain = m.from.address.split('@')[1] || 'localhost';
  const textPart = ['Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(m.text))].join('\r\n');

  let body: string;
  if (m.html) {
    const alt = `alt-${randomUUID()}`;
    body = [
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      '',
      `--${alt}`,
      textPart,
      `--${alt}`,
      ['Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(m.html))].join('\r\n'),
      `--${alt}--`,
    ].join('\r\n');
  } else {
    body = textPart;
  }

  if (m.attachments?.length) {
    const mixed = `mixed-${randomUUID()}`;
    body = [
      `Content-Type: multipart/mixed; boundary="${mixed}"`,
      '',
      `--${mixed}`,
      body,
      ...m.attachments.flatMap((a) => {
        const name = a.name.replace(/["\\\r\n]/g, '');
        return [
          `--${mixed}`,
          [
            `Content-Type: ${a.contentType}; name="${name}"`,
            `Content-Disposition: attachment; filename="${name}"`,
            'Content-Transfer-Encoding: base64',
            '',
            wrap(a.content.replace(/\s+/g, '')),
          ].join('\r\n'),
        ];
      }),
      `--${mixed}--`,
    ].join('\r\n');
  }

  const headers = [
    `From: ${mailbox(m.from)}`,
    `To: ${address(m.to)}`,
    ...(m.replyTo ? [`Reply-To: ${address(m.replyTo)}`] : []),
    `Subject: ${headerText(m.subject)}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
  ];
  return `${headers.join('\r\n')}\r\n${body}\r\n`;
}

/* ───────────────────────────── the conversation ───────────────────────────── */

type Reply = { code: number; lines: string[] };

/** Reads whole replies ("250-…" lines up to the "250 …" one) off a socket that can be swapped for its TLS upgrade. */
class Conversation {
  private buffer = '';
  private replies: Reply[] = [];
  private waiting: { resolve: (r: Reply) => void; reject: (e: Error) => void } | null = null;
  private failure: Error | null = null;
  private lines: string[] = [];
  socket: net.Socket;
  private timeoutMs: number;

  constructor(socket: net.Socket, timeoutMs: number) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.attach(socket);
  }

  attach(socket: net.Socket) {
    this.socket = socket;
    socket.setTimeout(this.timeoutMs, () => this.fail(new SmtpError('The mail server stopped answering.')));
    socket.on('data', (d: Buffer) => this.onData(d.toString('utf8')));
    socket.on('error', (e) => this.fail(e));
    socket.on('close', () => this.fail(new SmtpError('The mail server closed the connection.')));
  }

  /** Stop listening (before handing the socket to TLS, or when done). A late socket error is then ignored, not thrown. */
  detach() {
    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('error');
    this.socket.removeAllListeners('close');
    this.socket.on('error', () => {});
    this.socket.setTimeout(0);
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    let end: number;
    while ((end = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, end).replace(/\r$/, '');
      this.buffer = this.buffer.slice(end + 1);
      this.lines.push(line);
      const m = /^(\d{3})([ -]?)(.*)$/.exec(line);
      if (m && m[2] !== '-') {
        this.push({ code: Number(m[1]), lines: this.lines.map((l) => l.slice(4)) });
        this.lines = [];
      }
    }
  }

  private push(reply: Reply) {
    if (this.waiting) {
      const w = this.waiting;
      this.waiting = null;
      w.resolve(reply);
    } else {
      this.replies.push(reply);
    }
  }

  private fail(err: Error) {
    if (this.failure) return;
    this.failure = err;
    if (this.waiting) {
      const w = this.waiting;
      this.waiting = null;
      w.reject(err);
    }
  }

  read(): Promise<Reply> {
    const next = this.replies.shift();
    if (next) return Promise.resolve(next);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => (this.waiting = { resolve, reject }));
  }

  /** Send one command and expect one of `ok`; `shown` stands in for the command in errors (never the password). */
  async command(line: string, ok: number[], shown = line): Promise<Reply> {
    this.socket.write(`${line}\r\n`);
    const reply = await this.read();
    if (!ok.includes(reply.code)) {
      throw new SmtpError(`${shown.split(' ')[0]} refused: ${reply.code} ${reply.lines.join(' ').slice(0, 200)}`, reply.code);
    }
    return reply;
  }
}

/**
 * Send one message. Resolves when the server has accepted it for delivery;
 * throws an SmtpError otherwise. `tlsOptions` is for tests (a private CA).
 */
export async function sendSmtp(
  config: SmtpConfig,
  message: SmtpMessage,
  { tlsOptions = {}, timeoutMs = 20_000 }: { tlsOptions?: tls.ConnectionOptions; timeoutMs?: number } = {},
): Promise<void> {
  const helo = message.from.address.split('@')[1] || 'localhost';
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host, ...tlsOptions })
    : net.connect({ host: config.host, port: config.port });
  const talk = new Conversation(socket, timeoutMs);

  try {
    const greeting = await talk.read();
    if (greeting.code !== 220) throw new SmtpError(`The mail server said ${greeting.code} ${greeting.lines.join(' ')}`, greeting.code);
    let features = (await talk.command(`EHLO ${helo}`, [250])).lines.map((l) => l.toUpperCase());

    if (!config.secure) {
      if (!features.some((f) => f.startsWith('STARTTLS'))) {
        throw new SmtpError('The mail server does not offer STARTTLS, so the password was not sent. Use port 465.');
      }
      await talk.command('STARTTLS', [220]);
      talk.detach();
      const secured = tls.connect({ socket, servername: config.host, ...tlsOptions });
      await new Promise<void>((resolve, reject) => {
        secured.once('secureConnect', () => resolve());
        secured.once('error', reject);
      });
      talk.attach(secured);
      features = (await talk.command(`EHLO ${helo}`, [250])).lines.map((l) => l.toUpperCase());
    }

    const auth = features.find((f) => f.startsWith('AUTH ')) || '';
    if (/\bPLAIN\b/.test(auth) || !/\bLOGIN\b/.test(auth)) {
      await talk.command(`AUTH PLAIN ${Buffer.from(`\0${config.user}\0${config.password}`).toString('base64')}`, [235], 'AUTH PLAIN');
    } else {
      await talk.command('AUTH LOGIN', [334]);
      await talk.command(Buffer.from(config.user).toString('base64'), [334], 'AUTH LOGIN (user)');
      await talk.command(Buffer.from(config.password).toString('base64'), [235], 'AUTH LOGIN (password)');
    }

    await talk.command(`MAIL FROM:${address(message.from.address)}`, [250]);
    await talk.command(`RCPT TO:${address(message.to)}`, [250, 251]);
    await talk.command('DATA', [354]);
    // Base64 bodies never start a line with a dot, but headers are stuffed too, to be safe.
    const data = buildMessage(message).replace(/(^|\r\n)\./g, '$1..');
    await talk.command(`${data}.`, [250], 'DATA (message)');
    talk.socket.write('QUIT\r\n');
  } finally {
    talk.detach();
    talk.socket.end();
    talk.socket.destroy();
  }
}
