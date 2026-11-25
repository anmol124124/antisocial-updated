// A stand-in SMTP server for the mailer tests: TLS from the start (port 465
// style) or STARTTLS (port 587 style), AUTH PLAIN/LOGIN, and a record of every
// message it accepted. The key and certificate below are for "localhost" in
// these tests only (self-signed, never used anywhere else); the tests trust
// them by passing CERT as the CA.

import net from 'node:net';
import tls from 'node:tls';

const KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgyViVLgRUcy4X1A2r
H3oMpuv69iYAM32q/rADMVluvkGhRANCAAQZgQLJ7eRV44OQ8rPzhjEm9BYnlh8N
sVo2NlnOsQYK/KdKACORylwRnBu0nisxvAmVL7N5vhJF2NRt3vdUWLst
-----END PRIVATE KEY-----
`;

export const CERT = `-----BEGIN CERTIFICATE-----
MIIBmzCCAUGgAwIBAgIUA/pOHzuISX+qWdFtgjqfUQbg7MYwCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAyNjE5MDYzOVoYDzIxMjYxMDAy
MTkwNjM5WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAAQZgQLJ7eRV44OQ8rPzhjEm9BYnlh8NsVo2NlnOsQYK/KdKACORylwR
nBu0nisxvAmVL7N5vhJF2NRt3vdUWLsto28wbTAdBgNVHQ4EFgQUkpDFlfY0UzPF
zppbeDdUqxrewCYwHwYDVR0jBBgwFoAUkpDFlfY0UzPFzppbeDdUqxrewCYwDwYD
VR0TAQH/BAUwAwEB/zAaBgNVHREEEzARgglsb2NhbGhvc3SHBH8AAAEwCgYIKoZI
zj0EAwIDSAAwRQIgaL6P3x+IECKme7kCY/zqppcMHcitqDzjm6qtG7V8QH8CIQCh
xnWnVkVC696gaSF1cycTJ0/bTndM+dW/dFBEjekt6w==
-----END CERTIFICATE-----
`;

/**
 * Start a server on a free port. `mode` is "tls" (TLS from the first byte),
 * "starttls" (plain, upgraded on STARTTLS) or "plain" (no TLS offered at all).
 * `auth` is "PLAIN", "LOGIN" or "PLAIN LOGIN" as advertised.
 */
export async function startSmtp({ mode = 'tls', user = 'noreply@antisocialtalks.com', password = 'pa$$&word', auth = 'LOGIN PLAIN' } = {}) {
  const accepted = [];
  const sessions = [];

  function serve(socket, secure) {
    const s = { secure, plaintextPassword: false, user: null, password: null, from: null, to: [], commands: [] };
    sessions.push(s);
    let buffer = '';
    let data = null;
    let loginStep = null;
    const say = (line) => socket.write(`${line}\r\n`);
    const features = () =>
      ['250-localhost', ...(mode === 'starttls' && !s.secure ? ['250-STARTTLS'] : []), ...(s.secure ? [`250-AUTH ${auth}`] : []), '250 8BITMIME'].join('\r\n');
    const checkLogin = () => {
      if (!s.secure) s.plaintextPassword = true;
      if (s.user === user && s.password === password) say('235 2.7.0 Authentication successful');
      else say('535 5.7.8 Error: authentication failed');
    };

    socket.on('error', () => {});
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data !== null) {
          if (line === '.') {
            accepted.push({ from: s.from, to: [...s.to], data: data.join('\r\n') });
            data = null;
            say('250 2.0.0 Ok: queued');
          } else {
            data.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }
        if (loginStep === 'user') {
          s.user = Buffer.from(line, 'base64').toString();
          loginStep = 'password';
          say('334 UGFzc3dvcmQ6');
          continue;
        }
        if (loginStep === 'password') {
          s.password = Buffer.from(line, 'base64').toString();
          loginStep = null;
          checkLogin();
          continue;
        }
        const [verb] = line.split(' ');
        s.commands.push(verb.toUpperCase() === 'AUTH' ? line.split(' ').slice(0, 2).join(' ') : verb.toUpperCase());
        switch (verb.toUpperCase()) {
          case 'EHLO':
            say(features());
            break;
          case 'STARTTLS': {
            say('220 2.0.0 Ready to start TLS');
            // The rest of the conversation is a new, secure session on the same connection.
            socket.removeAllListeners('data');
            serve(new tls.TLSSocket(socket, { isServer: true, key: KEY, cert: CERT }), true);
            return;
          }
          case 'AUTH': {
            const [, method, initial] = line.split(' ');
            if (method.toUpperCase() === 'PLAIN') {
              const [, u, p] = Buffer.from(initial || '', 'base64').toString().split('\0');
              s.user = u;
              s.password = p;
              checkLogin();
            } else {
              loginStep = 'user';
              say('334 VXNlcm5hbWU6');
            }
            break;
          }
          case 'MAIL':
            s.from = /<([^>]*)>/.exec(line)?.[1];
            say('250 2.1.0 Ok');
            break;
          case 'RCPT':
            s.to.push(/<([^>]*)>/.exec(line)?.[1]);
            say('250 2.1.5 Ok');
            break;
          case 'DATA':
            data = [];
            say('354 End data with <CR><LF>.<CR><LF>');
            break;
          case 'QUIT':
            say('221 2.0.0 Bye');
            socket.end();
            break;
          default:
            say('502 5.5.2 Error: command not recognized');
        }
      }
    });
    if (!s.secure || mode === 'tls') say('220 localhost ESMTP stand-in');
  }

  const server =
    mode === 'tls'
      ? tls.createServer({ key: KEY, cert: CERT }, (socket) => serve(socket, true))
      : net.createServer((socket) => serve(socket, false));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: server.address().port,
    accepted,
    sessions,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** The parts of a MIME message, decoded: headers, then each leaf part's type and text. */
export function readMessage(raw) {
  const [head, ...rest] = raw.split('\r\n\r\n');
  const headers = {};
  for (const line of head.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) {
    const i = line.indexOf(':');
    headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  }
  const decodeWords = (v) => v.replace(/=\?UTF-8\?B\?([^?]*)\?=\s*/gi, (_, b) => Buffer.from(b, 'base64').toString('utf8'));
  const parts = [];
  const walk = (type, body) => {
    const boundary = /boundary="([^"]+)"/.exec(type)?.[1];
    if (!boundary) {
      parts.push({ type, text: Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8'), base64: body.replace(/\s+/g, '') });
      return;
    }
    for (const section of body.split(`--${boundary}`).slice(1, -1)) {
      const [h, ...b] = section.replace(/^\r\n/, '').split('\r\n\r\n');
      const partType = /Content-Type: ([^\r\n]+)/i.exec(h)?.[1] || '';
      const disposition = /Content-Disposition: ([^\r\n]+)/i.exec(h)?.[1] || '';
      if (/boundary=/.test(partType)) {
        // A nested multipart: its own header line is part of `h`.
        walk(partType, b.join('\r\n\r\n'));
      } else {
        parts.push({ type: partType, disposition, text: Buffer.from(b.join('').replace(/\s+/g, ''), 'base64').toString('utf8'), base64: b.join('').replace(/\s+/g, '') });
      }
    }
  };
  walk(headers['content-type'] || '', rest.join('\r\n\r\n'));
  return { headers, subject: decodeWords(headers.subject || ''), parts };
}
