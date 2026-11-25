import type { MetadataRoute } from 'next';

/** For "Add to Home Screen": the name and icon a phone shows. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AntiSocialTalks',
    short_name: 'AntiSocialTalks',
    description: 'The conversation platform for people who think differently. Not anti-society. Anti-silence.',
    start_url: '/',
    display: 'browser',
    background_color: '#0b0b0c',
    theme_color: '#0b0b0c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
