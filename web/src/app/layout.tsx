import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { CartProvider } from '@/components/shop/CartProvider';
import { MarketProvider } from '@/components/shop/MarketProvider';
import { isIndexable, siteUrl } from '@/lib/env';
import { SHARE_IMAGE } from '@/lib/meta';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'AntiSocialTalks | The Conversation Platform',
    template: '%s | AntiSocialTalks',
  },
  description:
    // Kept under ~155 characters so search results show it in full.
    'A global conversation and media platform exploring people, ideas and stories that challenge conventional thinking. Not anti-society. Anti-silence.',
  // No title, description, address or canonical here: every page inherits this, and its share
  // card then takes the page's own title and description (see pageLinks in lib/meta). The icons
  // are the app/favicon.ico, icon.png and apple-icon.png files.
  openGraph: { type: 'website', siteName: 'AntiSocialTalks', locale: 'en', images: [SHARE_IMAGE] },
  twitter: { card: 'summary_large_image' },
  // Belt and braces with robots.ts: a stage deploy also sends a meta noindex.
  robots: isIndexable()
    ? undefined
    : { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: '#0b0b0c' };

/**
 * Runs before first paint. Marks the page as JS-capable so scroll-reveal can
 * hide content until it animates in — then, if the app bundle has not
 * hydrated within 3s (blocked, failed, very slow network), takes the mark off
 * again so every section shows without its animation rather than staying
 * invisible.
 */
const REVEAL_FAILSAFE = `(function(){var d=document.documentElement;d.classList.add('js');setTimeout(function(){if(!window.__astRevealReady)d.classList.remove('js')},3000)})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The inline script changes <html>'s class before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_FAILSAFE }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Caveat:wght@600&family=Source+Serif+4:ital,wght@0,400;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        <MarketProvider>
          <CartProvider>
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </CartProvider>
        </MarketProvider>
      </body>
    </html>
  );
}
