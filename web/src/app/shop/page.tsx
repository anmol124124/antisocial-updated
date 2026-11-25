import type { Metadata } from 'next';
import { pageLinks } from '@/lib/meta';
import Link from 'next/link';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Media } from '@/components/ui/Media';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { assetUrl } from '@/lib/directus';
import { getShopProducts, slugify, type ShopProduct } from '@/lib/content';
import { DELIVERS_TO } from '@/lib/markets';
import { marketsFor } from '@/lib/cart-pricing';
import { gelatoIsConfigured, shopCurrency } from '@/lib/env';
import { MarketPrice } from '@/components/shop/MarketPrice';
import { shopIsOpen } from '@/lib/shop-status';

export const revalidate = 60;

/** The colours a product comes in, with the swatch set in the CMS. */
function swatchesOf(product: ShopProduct): { name: string; swatch: string }[] {
  // Only colours that can be made somewhere (a colour waiting for its Qikink code is left out).
  const sellable = (product.variants || []).filter((v) => marketsFor(product, v).length > 0);
  const names = [...new Set(sellable.map((v) => v.color).filter(Boolean))] as string[];
  return names.flatMap((name) => {
    const swatch = product.colorways?.[name]?.swatch;
    return swatch ? [{ name, swatch }] : [];
  });
}

export const metadata: Metadata = {
  ...pageLinks('/shop'),
  title: 'Shop',
  description:
    'The AntiSocials Limited Season 1 Drop: hoodies, tees, caps and tote bags, made to order.',
};

export default async function ShopPage() {
  const products = await getShopProducts();
  const currency = shopCurrency();
  // A missing key is an operator problem, not a visitor's — say so in the
  // server log rather than on the page.
  if (!gelatoIsConfigured()) {
    console.warn('[shop] GELATO_API_KEY is not set — live pricing and shipping quotes are off. Run npm run verify:gelato.');
  }

  return (
    <>
      <PageHero
        eyebrow="The AntiSocial Shop"
        title="WEAR THE"
        accent="CONVERSATION"
        lede="The AntiSocials Limited Season 1 Drop, Shop Now!!"
      >
        <Button href="#drop" variant="solid-light" arrow>
          Shop the Drop
        </Button>
      </PageHero>

      <section id="drop" className="scroll-mt-24 bg-cream py-16 lg:py-24">
        <Container>
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-mute">
              We ship to {DELIVERS_TO}.
            </p>
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="The first merch drop isn’t live yet."
              hint="Join the community and we’ll tell you when it is."
              action={
                <Button href="/community" variant="outline-dark" arrow>
                  Join the Community
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => {
                const slug = product.slug || slugify(product.title);
                return (
                  <li key={product.id}>
                    {/* Full height, so cards in a row line up with or without colour dots. */}
                    <Reveal delay={(i % 3) * 70} className="h-full">
                      <Link
                        href={`/shop/${slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-ink/[0.06] transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
                      >
                        {/* The model photo when there is one (square), else the flat mockup (3:2). */}
                        <Media
                          src={
                            product.photo
                              ? assetUrl(product.photo, { width: 900, height: 900 })
                              : assetUrl(product.mockup, { width: 1200, height: 800 })
                          }
                          alt={product.title}
                          tone={i}
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className={`${product.photo ? 'aspect-square' : 'aspect-[3/2]'} w-full`}
                        />
                        <div className="flex flex-1 flex-col p-6">
                          <h2 className="text-base font-bold tracking-tight">{product.title}</h2>
                          {swatchesOf(product).length > 1 && (
                            <p className="mt-2 flex items-center gap-1.5" aria-label={`Colours: ${swatchesOf(product).map((s) => s.name).join(', ')}`}>
                              {swatchesOf(product).map((s) => (
                                <span key={s.name} title={s.name} className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/20" style={{ background: s.swatch }} />
                              ))}
                            </p>
                          )}
                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-ink-mute">
                              {product.description}
                            </p>
                          )}
                          {/* Pushed to the bottom; the description keeps its two lines. */}
                          <p className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm font-bold">
                            <MarketPrice prices={product.prices} price={product.price} currency={product.currency || currency} />
                            {!shopIsOpen() && (
                              <span className="rounded-full bg-sand/20 px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-sand-deep">
                                Coming Soon
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
