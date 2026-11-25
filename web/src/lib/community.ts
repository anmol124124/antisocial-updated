/**
 * The community forms the site accepts. The list is code (each one is a form
 * the API validates and a page under /community/<slug>); their wording is
 * edited in the CMS (Community ways): see getCommunityWays() in site-content.ts.
 */
export const COMMUNITY_FORMS = ['story', 'question', 'speaker', 'community', 'partner'] as const;

export type SubmissionType = (typeof COMMUNITY_FORMS)[number];

export const isSubmissionType = (value: string): value is SubmissionType =>
  (COMMUNITY_FORMS as readonly string[]).includes(value);
