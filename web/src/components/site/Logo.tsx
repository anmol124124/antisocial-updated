import Link from 'next/link';

export function Logo({ className = '', onDark = true }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="AntiSocialTalks home"
      className={`inline-flex items-baseline text-xl leading-none tracking-[-0.03em] ${
        onDark ? 'text-white' : 'text-ink'
      } ${className}`}
    >
      <span className="font-display font-black tracking-[-0.04em]">AntiSocial</span>
      <span className="font-display font-medium tracking-[-0.03em]">Talks</span>
    </Link>
  );
}
