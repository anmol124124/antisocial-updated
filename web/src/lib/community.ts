import type { SubmissionType } from '@/components/forms/SubmissionForm';

export type Way = {
  slug: SubmissionType;
  title: string;
  /** Strong verb + specific noun, shown on the card that opens this form. */
  cta: string;
  blurb: string;
  heading: string;
  accent: string;
  lede: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  showInterest?: boolean;
};

/** The five community CTAs, and the copy each of their form pages uses. */
export const WAYS: Way[] = [
  {
    slug: 'story',
    title: 'Share Your Story',
    cta: 'Tell Your Story',
    blurb: 'Something happened that you’ve never talked about publicly.',
    heading: 'Tell us what happened',
    accent: 'and why it stayed with you.',
    lede: 'Some of our best conversations come from people who have never been interviewed before. If you have a story like that, tell us here.',
    messageLabel: 'Your story',
    messagePlaceholder: 'What happened, and why does it still matter to you?',
    submitLabel: 'Share my story',
    showInterest: true,
  },
  {
    slug: 'question',
    title: 'Submit a Question',
    cta: 'Ask Your Question',
    blurb: 'A question you’d like us to put to a guest.',
    heading: 'Ask the question',
    accent: 'nobody else will.',
    lede: 'If we use your question with a guest, we’ll credit you on the episode.',
    messageLabel: 'Your question',
    messagePlaceholder: 'What would you ask, and who would you ask it of?',
    submitLabel: 'Submit my question',
  },
  {
    slug: 'speaker',
    title: 'Suggest a Speaker',
    cta: 'Nominate Someone',
    blurb: 'Someone you think we should interview.',
    heading: 'Point us at someone',
    accent: 'worth listening to.',
    lede: 'They don’t need to be famous. Tell us who they are and why you think people should hear from them.',
    messageLabel: 'Who should we talk to?',
    messagePlaceholder: 'Their name, what they do, and what makes their thinking worth an hour.',
    submitLabel: 'Suggest them',
  },
  {
    slug: 'community',
    title: 'Join the Community',
    cta: 'Join Now',
    blurb: 'Be part of the conversation.',
    heading: 'Be part of',
    accent: 'the conversation.',
    lede: 'We email you when a new episode comes out or a chapter opens in your city. That’s all we send.',
    messageLabel: 'Anything you want us to know',
    messagePlaceholder: 'Optional. What brought you here?',
    submitLabel: 'Join the community',
  },
  {
    slug: 'partner',
    title: 'Partner With Us',
    cta: 'Start a Chapter',
    blurb: 'Venues, sponsors and city chapters.',
    heading: 'Bring AntiSocialTalks',
    accent: 'to your city.',
    lede: 'Venues, sponsors, production partners and anyone who wants to run a chapter where they live. Tell us what you have in mind.',
    messageLabel: 'What do you have in mind?',
    messagePlaceholder: 'Your organisation, your city, and what a partnership would look like.',
    submitLabel: 'Start the conversation',
  },
];

export function wayBySlug(slug: string): Way | undefined {
  return WAYS.find((w) => w.slug === slug);
}
