/**
 * Copy for the Chapters pages, taken from "Chapters, and how everyone joins
 * AntiSocialTalks" (legal and tech brief, from the chapter doc by Dr. Kapoor).
 * Kept in one place so the wording can be confirmed and edited together.
 */

export const MISSION =
  'Bring meaningful conversations to communities around the world, through podcasts, live talks, events and local storytelling.';

export const VISION =
  'A global network of local chapters. Don’t just attend inspiring talks. Create the platform that makes them possible.';

export const NETWORK =
  'AntiSocial Talks is building a global network of local chapters that bring meaningful conversations to communities around the world, through podcasts, live talks, events and local storytelling.';

/** What a chapter does. */
export const CHAPTER_ACTIVITIES = [
  { title: 'Host conversations', body: 'Podcasts, interviews, live talks, panels, moderated discussions.' },
  { title: 'Discover speakers', body: 'Experts and emerging voices, including people who have never had a platform.' },
  { title: 'Build a community', body: 'People who want to think critically, listen openly and learn.' },
  { title: 'Create stories', body: 'Video, audio and written content, with consent and production support.' },
  { title: 'Create opportunities', body: 'Help speakers meet collaborators and turn inspiration into action.' },
];

export const CHAPTER_FRAMEWORK =
  'Every chapter runs its own programme inside the global brand and chapter standards. The global team provides the framework, brand guidance, speaker standards and onboarding. Training, support and any financial terms are written into the official chapter programme.';

/** The five questions on the Start a Chapter form. */
export const FOUNDER_QUESTIONS = [
  { label: 'Where', body: 'City and country for the chapter' },
  { label: 'Why', body: 'Why the mission matters to you' },
  { label: 'Who', body: 'Alone, or with a founding team' },
  { label: 'What', body: 'Conversations and events you want to create' },
  { label: 'How', body: 'First steps: speakers, venues, connections' },
];

/** From expression of interest to a growing chapter. Also the onboarding tracker in the CMS. */
export const FOUNDER_STEPS = [
  'Expression of interest',
  'Founder orientation',
  'Submit a launch plan',
  'Chapter approval and terms',
  'Launch the first event',
  'Grow the chapter',
];

export const FOUNDER_STEPS_NOTE =
  'After the form, a conversation checks fit and explains chapter standards. The central team reviews the plan and authorises use of the chapter brand.';

/** How to Start Your Chapter: the first 30 days. */
export const FIRST_30_DAYS = [
  { days: 'Days 1–5', title: 'Define your vision', body: 'Why your city needs a chapter. Write a short local statement.' },
  { days: 'Days 6–10', title: 'Find your people', body: 'Recruit two to five people with complementary strengths.' },
  { days: 'Days 11–15', title: 'Discover speakers', body: 'Build a shortlist. Look for ideas and stories, not job titles.' },
  { days: 'Days 16–20', title: 'Plan your first event', body: 'Theme, speakers, venue, budget, schedule, recording permissions.' },
  { days: 'Days 21–25', title: 'Invite your audience', body: 'Event page, networks, community groups. Right audience over biggest.' },
  { days: 'Days 26–30', title: 'Deliver and learn', body: 'Host, thank everyone, collect feedback, plan the next one.' },
];

export const FIRST_30_DAYS_NOTE =
  'This is a suggested schedule only. Real timing depends on chapter approval, venue, speaker commitments and local requirements.';

/** How to Organise an Event: the repeatable first conversation. */
export const FIRST_EVENT_RUNSHEET = [
  { time: '00:00–00:10', title: 'Welcome', body: 'Introduce AntiSocial Talks, the theme and the speakers.' },
  { time: '00:10–00:40', title: 'Three ideas', body: 'About 10 minutes each, three distinct views.' },
  { time: '00:40–01:00', title: 'The conversation', body: 'A moderator explores differences and open questions.' },
  { time: '01:00–01:15', title: 'Audience questions', body: 'Thoughtful questions and respectful disagreement.' },
  { time: '01:15–01:30', title: 'What happens next', body: 'Nominations, volunteers, next steps for the chapter.' },
];

export const EVENT_GUIDE_STEPS = [
  'Choose a theme',
  'Build the programme',
  'Find a venue',
  'Set a budget',
  'Promote',
  'Prepare speakers and host',
  'Deliver',
  'Continue the conversation',
];

export const EVENT_GUIDE_NOTE =
  'Venue, insurance, permits, recording permissions and budget transparency are part of every event plan, agreed with the central team before anything is announced.';

/** Discover Talent. */
export const TALENT_SOURCES =
  'Universities and research. Startups and founders. Community groups and nonprofits. Arts and creative communities. Professional and scientific networks. The wider community, by personal recommendation.';

export const SPEAKER_QUALITIES =
  'A clear idea, honest communication, willingness to prepare, fit for the audience. Judged on the contribution, not on fame.';

/** The four actions that close every Chapters page. The first is the primary one. */
export const JOIN_ACTIONS = [
  { href: '/chapters/start', title: 'Start a Chapter', body: 'Ready to lead? Start a chapter in your city.' },
  { href: '/chapters/apply/speak', title: 'Nominate a Speaker', body: 'Know someone with a remarkable idea?' },
  { href: '/chapters/apply/local-team', title: 'Become a Volunteer', body: 'Want to help make it happen?' },
  { href: '/chapters/how-to-organise', title: 'Plan Your First Event', body: 'The 90-minute format and the full guide.' },
];

/** The guide pages, linked from the Chapters hub. */
export const CHAPTER_GUIDES = [
  { href: '/chapters/become-a-leader', title: 'Become a Chapter Leader', body: 'What leading a chapter means, and the support you get.' },
  { href: '/chapters/what-happens', title: 'What Happens in a Chapter?', body: 'Conversations, speakers, community, stories, opportunities.' },
  { href: '/chapters/how-to-start', title: 'How to Start Your Chapter', body: 'From decision to first event in 30 days.' },
  { href: '/chapters/discover-talent', title: 'Discover Talent', body: 'Find the voices the world hasn’t heard yet.' },
  { href: '/chapters/how-to-organise', title: 'How to Organise an Event', body: 'A repeatable 90-minute first event.' },
];
