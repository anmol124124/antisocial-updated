export type NavItem = { href: string; label: string };

export const primaryNav: NavItem[] = [
  { href: '/about', label: 'About' },
  { href: '/episodes', label: 'Episodes' },
  { href: '/voices', label: 'Meet the Voices' },
  { href: '/stories', label: 'Stories' },
  { href: '/chapters', label: 'Chapters' },
  { href: '/events', label: 'Events' },
  { href: '/shop', label: 'Shop' },
];

export const footerNav: NavItem[] = [
  { href: '/', label: 'Home' },
  ...primaryNav,
  // Not in the header (it's full); reachable from the footer and the Events page.
  { href: '/roadshow', label: 'Roadshow' },
  { href: '/chapters/start', label: 'Start a Chapter' },
  { href: '/community', label: 'Join the Community' },
];

// Share-tracking params (?si=, ?s=, ?stkn=, ?_r=&_t=) are stripped — they
// identify who shared a link, not which profile to open.
export const YOUTUBE_URL = 'https://www.youtube.com/@antisocialtalks-u6j';
export const INSTAGRAM_URL = 'https://www.instagram.com/antisocialtalksofficial';
export const X_URL = 'https://x.com/antisocialtalks';
export const LINKEDIN_URL = 'https://www.linkedin.com/company/anti-social-talks/';
// TikTok and Spotify as the team listed them on 18 Nov 2026.
export const TIKTOK_URL = 'https://www.tiktok.com/@antisocialtalks';
export const SPOTIFY_URL = 'https://open.spotify.com/show/66DmoJEVAPPMU2Sfpi3FAA';

export type SocialKey = 'instagram' | 'youtube' | 'spotify' | 'tiktok' | 'x' | 'linkedin';

/** Every official profile, in display order. Hero and footer both render from this. */
export const SOCIAL_LINKS: { key: SocialKey; label: string; href: string }[] = [
  { key: 'instagram', label: 'Instagram', href: INSTAGRAM_URL },
  { key: 'youtube', label: 'YouTube', href: YOUTUBE_URL },
  { key: 'spotify', label: 'Spotify', href: SPOTIFY_URL },
  { key: 'tiktok', label: 'TikTok', href: TIKTOK_URL },
  { key: 'x', label: 'X', href: X_URL },
  { key: 'linkedin', label: 'LinkedIn', href: LINKEDIN_URL },
];
