import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import { LegalPage } from '@/components/legal/LegalPage';
import { PRIVACY } from '@/lib/legal';

export const metadata: Metadata = {
  ...pageLinks('/privacy'),
  title: 'Privacy Policy',
  description:
    'How AntiSocial Talks collects, uses, shares and protects personal information, your rights over it, and how to reach our Privacy Officer.',
};

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} eyebrow="Legal" />;
}
