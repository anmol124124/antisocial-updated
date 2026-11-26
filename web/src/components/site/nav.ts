export type NavItem = { href: string; label: string };

export const primaryNav: NavItem[] = [
  { href: '/about', label: 'About' },
  { href: '/episodes', label: 'Episodes' },
  { href: '/voices', label: 'Meet the Voices' },
  { href: '/stories', label: 'Stories' },
  { href: '/chapters', label: 'Chapters' },
  { href: '/events', label: 'Events' },
  { href: '/shop', label: 'Shop' },
  { href: '/blogs', label: 'Blogs' },
];

export const footerNav: NavItem[] = [
  { href: '/', label: 'Home' },
  ...primaryNav,
  // Not in the header (it's full); reachable from the footer and the Events page.
  { href: '/roadshow', label: 'Roadshow' },
  { href: '/chapters/start', label: 'Start a Chapter' },
  { href: '/community', label: 'Join the Community' },
];

// The social profiles are edited in the CMS (Site settings): see getSiteSettings() in lib/site-content.ts.
