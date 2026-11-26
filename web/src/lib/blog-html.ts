import sanitizeHtml from 'sanitize-html';

/**
 * A blog post's body as the CMS editor saved it, made safe to put in the page.
 *
 * The post is written in Directus' rich-text editor, so it arrives as HTML.
 * Only the tags that editor's toolbar makes are kept (headings, paragraphs,
 * lists, quotes, links, pictures, lines); scripts, styles, frames, forms and
 * every event handler are dropped. So a pasted Word document or a compromised
 * CMS account cannot run anything on the site.
 *
 *  - Pictures inserted from the CMS file library point at the CMS itself. They
 *    are rewritten to this site's /api/assets proxy (the CMS address and token
 *    never reach the page). Any other picture is dropped: the site only shows
 *    images it serves itself.
 *  - Links may be web, email or phone links; ones to other sites open in a new
 *    tab without access to this page.
 *  - A Heading 1 becomes a Heading 2: the post's title is the page's only h1.
 */

const ASSET = /\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=[/?#.]|$)/i;

/** The /api/assets address for a CMS picture inside a post, or null for any other picture. */
export function bodyImageSrc(src: string | undefined): string | null {
  const id = src ? ASSET.exec(src)?.[1] : null;
  return id ? `/api/assets/${id.toLowerCase()}?width=1600&quality=82&format=webp&withoutEnlargement=true` : null;
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

export function cleanPostHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'figure', 'figcaption'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    // Script, style and the like go with their contents, not just their tags.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed', 'svg', 'math'],
    transformTags: {
      h1: 'h2',
      a: (tagName, attribs) => {
        const href = (attribs.href || '').trim();
        const out: Record<string, string> = isExternal(href) ? { href, target: '_blank', rel: 'noopener noreferrer' } : href ? { href } : {};
        return { tagName, attribs: out };
      },
      img: (tagName, attribs) => {
        const src = bodyImageSrc(attribs.src);
        if (!src) return { tagName: 'drop-img', attribs: {} };
        const out: Record<string, string> = { src, alt: attribs.alt || '', loading: 'lazy', decoding: 'async' };
        for (const k of ['width', 'height'] as const) if (/^\d{1,5}$/.test(attribs[k] || '')) out[k] = attribs[k];
        return { tagName, attribs: out };
      },
    },
    // Pictures from anywhere but the CMS, and paragraphs left empty by the editor.
    exclusiveFilter: (frame) => frame.tag === 'drop-img' || (frame.tag === 'p' && !frame.text.trim() && !frame.mediaChildren.length),
  }).trim();
}

/** Minutes to read, at about 220 words a minute; at least 1. */
export function readingMinutes(html: string | null | undefined): number {
  const words = (html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
