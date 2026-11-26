import 'server-only';
import { readItems } from './directus';
import { slugify } from './content';

/** One post in the CMS (Blog Posts). Only "published" ones are ever read by the site. */
export type BlogPost = {
  id: number;
  status: 'draft' | 'published' | string;
  title: string;
  /** Empty = made from the title. */
  slug: string | null;
  /** The date shown; empty = the day it was created. */
  published_at: string | null;
  author: string | null;
  cover_image: string | null;
  summary: string | null;
  /** HTML from the CMS editor: always shown through cleanPostHtml(). */
  body: string | null;
  date_created?: string | null;
  date_updated?: string | null;
};

export function postSlug(post: Pick<BlogPost, 'slug' | 'title'>): string {
  return (post.slug && slugify(post.slug)) || slugify(post.title);
}

/** The date a post goes by: its own, else when it was created. */
export function postDate(post: Pick<BlogPost, 'published_at' | 'date_created'>): string | null {
  return post.published_at || post.date_created || null;
}

/** "26 November 2026". Dates are shown as written in the CMS, whatever the visitor's time zone. */
export function formatPostDate(iso: string | null, month: 'long' | 'short' = 'long'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' });
}

const time = (post: BlogPost) => new Date(postDate(post) || 0).getTime() || 0;

/** Published posts, newest first. */
export async function getBlogPosts(limit = 200): Promise<BlogPost[]> {
  const rows = await readItems<BlogPost>('blog_posts', {
    // The website policy only allows reading published posts; filtering here as
    // well keeps drafts out even if that permission is ever loosened.
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    // `*` so a field added later comes through without breaking an older CMS.
    fields: '*',
    sort: '-date_created',
    limit,
  });
  // Sorted here: a post without its own date goes by when it was created.
  return rows.filter((p) => p && p.title).sort((a, b) => time(b) - time(a) || b.id - a.id);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const all = await getBlogPosts();
  return all.find((p) => postSlug(p) === slug) ?? null;
}
