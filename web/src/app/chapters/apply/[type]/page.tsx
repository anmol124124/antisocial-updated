import type { Metadata } from 'next';
import { metaDescription } from '@/lib/meta';
import { notFound } from 'next/navigation';
import { ApplicationPage } from '@/components/chapters/ApplicationPage';
import { APPLICATIONS, COMMUNITY_OPTIONS, applicationBySlug } from '@/lib/chapters';

/** Apply to Speak, Join the Local Team, Partner with a Chapter. */
export function generateStaticParams() {
  return COMMUNITY_OPTIONS.map((t) => ({ type: APPLICATIONS[t].slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const config = applicationBySlug(type);
  if (!config || !COMMUNITY_OPTIONS.includes(config.type)) return { title: 'Not found' };
  return { title: config.title, description: metaDescription(config.lede), alternates: { canonical: `/chapters/apply/${config.slug}` } };
}

export default async function ApplyPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const config = applicationBySlug(type);
  // Start a Chapter and the organiser form have their own pages with the review steps.
  if (!config || !COMMUNITY_OPTIONS.includes(config.type)) notFound();
  return <ApplicationPage type={config.type} />;
}
