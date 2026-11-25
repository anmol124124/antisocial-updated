import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { LegalPage } from '@/components/legal/LegalPage';
import { TERMS } from '@/lib/legal';

export const metadata: Metadata = {
  ...pageLinks('/terms'),
  title: 'Terms of Use',
  description:
    'The terms that govern the AntiSocial Talks website, podcast, events, City Chapter Program and related services.',
};

export default function TermsPage() {
  return <LegalPage doc={TERMS} eyebrow="Legal" />;
}
