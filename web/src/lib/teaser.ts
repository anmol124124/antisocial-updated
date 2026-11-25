/**
 * The pre-launch teaser clip (14.8 s, with sound), shown in place of the
 * episode player until Episode 01 is published.
 *
 * Captions: put a WebVTT file at public/video/teaser.en.vtt and set
 * `captions` to '/video/teaser.en.vtt'. Left null until the transcript is
 * supplied, so the player never points at a file that doesn't exist.
 */
export const TEASER = {
  src: '/video/teaser.mp4',
  poster: '/images/episode-cover.jpg',
  captions: null as string | null,
  label: 'AntiSocialTalks teaser',
};
