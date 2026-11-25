import type { Metadata } from 'next';

/**
 * The share card a link shows when its page has no picture of its own. The picture is chosen in
 * the CMS (Site settings) and served at /og-image.jpg by app/api/share-image (see next.config.ts):
 * an address outside /api/, which robots.txt keeps open for X's and LinkedIn's card crawlers.
 */
export const SHARE_IMAGE = {
  url: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'AntiSocialTalks: They called us AntiSocial. We decided to talk.',
};

export type ShareImage = { url: string; width: number; height: number; alt: string };

/** A CMS image as a share picture: a 1200px JPEG (some apps don't show WebP previews). */
export function shareImage(fileId: string | null | undefined, alt: string): ShareImage | null {
  return fileId ? { url: `/api/assets/${fileId}?width=1200&height=1200&fit=cover&format=jpg&quality=85`, width: 1200, height: 1200, alt } : null;
}

/**
 * A page's own address and share card. Title and description are left out on
 * purpose: Next.js then fills the share card with the page's own title and
 * description, so a shared link shows this page, not the home page.
 */
export function pageLinks(path: string, image?: ShareImage | null): Pick<Metadata, 'alternates' | 'openGraph'> {
  return {
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: 'AntiSocialTalks', locale: 'en', url: path, images: [image || SHARE_IMAGE] },
  };
}

/**
 * A CMS text as a meta description: one line, at most 155 characters, cut at
 * a word with an ellipsis. Search results show about that much, so a full bio
 * pasted in would otherwise be cut off mid-word.
 *
 * Give a `fallback` for fields that can be empty: a page whose metadata says
 * `description: undefined` ends up with no description at all, not the
 * layout's.
 */
export function metaDescription(text: string | null | undefined, fallback?: string, max = 155): string | undefined {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const words = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${words.replace(/[\s.,;:!?–-]+$/, '')}…`;
}
