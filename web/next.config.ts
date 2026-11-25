import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

/**
 * Directus serves every uploaded image, so its host has to be allow-listed for
 * next/image. The protocol and port are taken from the configured URL rather
 * than hardcoded, so the same config works for a local and a live CMS.
 */
function directusPattern(): RemotePattern | null {
  const raw = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: '/assets/**',
    };
  } catch {
    return null;
  }
}

/**
 * Security headers on every response. The Content-Security-Policy lists the
 * only outside hosts the browser loads from: Google Fonts, YouTube thumbnails
 * and the youtube-nocookie player. Everything else (CMS pictures, video) comes
 * through this site. 'unsafe-inline' scripts are needed by Next.js itself.
 * Development is left without a CSP, because hot reloading uses eval.
 */
function securityHeaders() {
  const https = (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https://');
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://i.ytimg.com",
    "media-src 'self' blob:",
    'frame-src https://www.youtube-nocookie.com',
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  return [
    ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: csp }] : []),
    ...(https ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
  async redirects() {
    return [
      // Old URLs keep working. All temporary (307) while the site is on
      // staging, so nothing is cached by browsers if the names change again;
      // switch to permanent once the production URLs are final.
      //
      // "The AntiSocial 100" was removed on 2026-10-08 — its link lands on
      // the full list of voices instead of a 404.
      { source: '/antisocial-100', destination: '/voices', permanent: false },
      // "Guests" became "Voices", and "AntiSocial Live" became "Chapters".
      { source: '/guests', destination: '/voices', permanent: false },
      { source: '/guests/:slug', destination: '/voices/:slug', permanent: false },
      { source: '/live', destination: '/chapters', permanent: false },
      // Events moved out of Chapters on 2026-10-13: Chapters is the podcast by
      // city, Events is where people meet in person.
      { source: '/chapters/events/:slug', destination: '/events/:slug', permanent: false },
      // While the shop is "Coming Soon" there is no cart to show.
      ...(process.env.NEXT_PUBLIC_SHOP_OPEN === 'false'
        ? [
            { source: '/cart', destination: '/shop', permanent: false },
            { source: '/checkout', destination: '/shop', permanent: false },
          ]
        : []),
      { source: '/live/:slug', destination: '/chapters/:slug', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      // CMS pictures normally come through this app's own /api/assets proxy (no host needed);
      // this allows direct Directus URLs too, for whichever CMS the env points at.
      directusPattern(),
      { protocol: 'https', hostname: '**.gelatoapis.com' },
      { protocol: 'https', hostname: 'gelato-api-live.s3.eu-west-1.amazonaws.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ].filter((p): p is RemotePattern => p !== null),
  },
};

export default nextConfig;
