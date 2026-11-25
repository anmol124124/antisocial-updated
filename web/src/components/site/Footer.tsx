import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Logo } from './Logo';
import { footerNav } from './nav';
import { getSiteSettings } from '@/lib/site-content';
import { SocialIcon } from '@/components/ui/SocialIcons';
import { NewsletterForm } from '@/components/forms/NewsletterForm';

export async function Footer() {
  const { social } = await getSiteSettings();
  return (
    <footer className="grain relative border-t border-white/10 bg-ink text-white">
      <Container className="relative z-10 py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
          <div>
            {/* The footer lines of the homepage brief, in the hand the closing call used for them. */}
            <div className="mb-7 font-hand text-[2rem] leading-none">
              <p className="text-sand">Think differently.</p>
              <p className="text-white/85">Talk openly.</p>
            </div>
            <Logo />
            <p className="mt-6 font-hand text-2xl text-sand">Not anti-society. Anti-silence.</p>
          </div>

          <nav aria-label="Footer">
            <h4 className="eyebrow mb-5 text-white/45">Explore</h4>
            <ul className="space-y-3">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h4 className="eyebrow mb-5 text-white/45">Listen &amp; Follow</h4>
            <ul className="space-y-3">
              {social.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <SocialIcon name={s.key} className="h-4 w-4" />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="eyebrow mb-5 text-white/45">Join the Community</h4>
            <p className="mb-4 text-sm text-white/55">
              We email you when a new episode comes out, and that’s it.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AntiSocialTalks.com. All rights reserved.</span>
          <span className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white/70">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white/70">
              Terms
            </Link>
            <Link href="/community" className="transition-colors hover:text-white/70">
              Contact
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
