import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'solid-dark' | 'solid-light' | 'outline-dark' | 'outline-light' | 'sand';

const base =
  'group inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full px-6 py-2.5 text-center text-[0.6875rem] font-bold uppercase tracking-[0.16em] transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  'solid-dark': 'bg-ink text-white hover:bg-ink-soft hover:shadow-lg hover:shadow-black/15',
  'solid-light': 'bg-white text-ink hover:bg-cream-deep',
  'outline-dark': 'border border-ink/30 text-ink hover:border-ink hover:bg-ink hover:text-white',
  'outline-light': 'border border-white/40 text-white hover:border-white hover:bg-white hover:text-ink',
  sand: 'bg-sand text-ink hover:bg-sand-light',
};

export function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3 w-3 transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:translate-x-1"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Button({
  href,
  variant = 'solid-dark',
  className = '',
  children,
  arrow = false,
  external = false,
  ...rest
}: {
  href?: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  arrow?: boolean;
  external?: boolean;
} & Omit<ComponentProps<'button'>, 'ref'>) {
  const cls = `${base} ${variants[variant]} ${className}`;
  const inner = (
    <>
      {children}
      {arrow && <ArrowIcon />}
    </>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button className={cls} {...rest}>
      {inner}
    </button>
  );
}
