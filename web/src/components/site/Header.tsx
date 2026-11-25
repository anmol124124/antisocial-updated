'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { primaryNav } from './nav';
import { useCart } from '@/components/shop/CartProvider';
import { shopIsOpen } from '@/lib/shop-status';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();

  // Solid black at the top of the page, frosted once you start scrolling —
  // keeps the hero edge-to-edge without the nav ever losing contrast.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-500 ${
        scrolled
          ? 'border-white/10 bg-ink/80 backdrop-blur-xl supports-[backdrop-filter]:bg-ink/65'
          : 'border-white/10 bg-ink'
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-7 xl:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive(item.href)}
              className="link-underline whitespace-nowrap text-[0.8125rem] font-medium text-white/75 transition-colors after:!bg-signal hover:text-white data-[active=true]:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {shopIsOpen() && (
          <Link
            href="/cart"
            aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            className="relative hidden h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            {count > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[0.625rem] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          )}

          <Link
            href="/community"
            className="hidden h-10 items-center whitespace-nowrap rounded-full border border-white/40 px-5 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white hover:text-ink md:inline-flex"
          >
            Join the Community
          </Link>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full text-white transition hover:bg-white/10 xl:hidden"
          >
            <span
              className={`block h-[1.5px] w-5 bg-current transition-transform duration-300 ${open ? 'translate-y-[6.5px] rotate-45' : ''}`}
            />
            <span className={`block h-[1.5px] w-5 bg-current transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
            <span
              className={`block h-[1.5px] w-5 bg-current transition-transform duration-300 ${open ? '-translate-y-[6.5px] -rotate-45' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-white/10 bg-ink xl:hidden"
      >
        <nav aria-label="Mobile" className="px-5 py-4 sm:px-8">
          <ul className="flex flex-col">
            {[{ href: '/', label: 'Home' }, ...primaryNav, { href: '/community', label: 'Join the Community' }].map(
              (item, i) => (
                <li key={item.href} style={{ animationDelay: `${i * 35}ms` }} className="animate-reveal">
                  <Link
                    href={item.href}
                    data-active={isActive(item.href)}
                    className="flex items-center justify-between border-b border-white/[0.07] py-3.5 text-base font-medium text-white/85 transition-colors hover:text-white data-[active=true]:text-signal"
                  >
                    {item.label}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 opacity-40">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ),
            )}
          </ul>
          {shopIsOpen() && (
            <Link
              href="/cart"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-6 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white"
            >
              Cart {count > 0 && `(${count})`}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
