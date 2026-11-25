import type { ReactNode } from 'react';
import type { SocialKey } from '@/lib/site-content';

export function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.25v5.5l4.75-2.75z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SpotifyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M7.4 9.4c3.2-1 6.7-.7 9.4.9M8 12.5c2.6-.8 5.4-.5 7.6.8M8.6 15.4c2-.6 4.1-.4 5.8.6" />
    </svg>
  );
}

export function TikTokIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M16.6 3c.32 2.13 1.6 3.6 3.9 3.82v3.03a7.1 7.1 0 0 1-3.86-1.2v6.15A5.7 5.7 0 1 1 11 9.13v3.12a2.66 2.66 0 1 0 2.56 2.66V3h3.04z" />
    </svg>
  );
}

export function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2z" />
    </svg>
  );
}

export function LinkedInIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 10.5V16.5M12 16.5v-3.5a2.25 2.25 0 0 1 4.5 0v3.5M12 10.5v6" strokeLinecap="round" />
      <circle cx="8" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Icon for a SOCIAL_LINKS key, so callers can render the list with one map(). */
export function SocialIcon({ name, className }: { name: SocialKey; className?: string }) {
  switch (name) {
    case 'instagram':
      return <InstagramIcon className={className} />;
    case 'youtube':
      return <YouTubeIcon className={className} />;
    case 'spotify':
      return <SpotifyIcon className={className} />;
    case 'tiktok':
      return <TikTokIcon className={className} />;
    case 'x':
      return <XIcon className={className} />;
    case 'linkedin':
      return <LinkedInIcon className={className} />;
  }
}

/** Round icon-only link, sized to sit in a row of h-11 buttons on a dark background. */
export function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:border-white hover:bg-white hover:text-ink active:scale-[0.96]"
    >
      {children}
    </a>
  );
}
