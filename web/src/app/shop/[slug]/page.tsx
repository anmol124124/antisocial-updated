import type { Metadata } from 'next';
import { metaDescription, pageLinks, shareImage } from '@/lib/meta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AddToCart } from '@/components/shop/AddToCart';
import { assetUrl } from '@/lib/directus';
import { getShopProductBySlug, getShopProducts, imagesFor, slugify, specsFor } from '@/lib/content';
import { marketsFor } from '@/lib/cart-pricing';
import { MARKET_CODES } from '@/lib/markets';
import { ProductColourProvider, ProductGallery, type GalleryImage } from '@/components/shop/ProductColour';
import { ProductSpecs, type SpecTable } from '@/components/shop/ProductSpecs';
import { shopCurrency } from '@/lib/env';
import { MarketPrice } from '@/components/shop/MarketPrice';
import { shopIsOpen } from '@/lib/shop-status';

export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getShopProducts();
  return products.map((p) => ({ slug: p.slug || slugify(p.title) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.title,
    description: metaDescription(product.description, `${product.title} from the AntiSocialTalks shop, printed to order.`),
    // A shared product link shows the product: its model photo, else its mockup.
    ...pageLinks(`/shop/${slug}`, shareImage(product.photo || product.mockup, product.title)),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);
  if (!product) notFound();

  const currency = product.currency || shopCurrency();
  const image = assetUrl(product.mockup, { width: 1800, height: 1200 });

  // One set of pictures per colour. The model photo leads when there is one;
  // the first colour's flat mockup (front and back) is wide, the others' square.
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const colourNames = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];
  const galleryFor = (color: string | null): GalleryImage[] => {
    const pics = imagesFor(product, color);
    const name = color && colourNames.length > 1 ? `${product.title}, ${color}` : product.title;
    const list: (GalleryImage | null)[] = [
      pics.photo ? { src: assetUrl(pics.photo, { width: 1200, height: 1200 })!, alt: `${name}, worn by a model`, square: true } : null,
      pics.mockup
        ? {
            src: assetUrl(pics.mockup, pics.own ? { width: 1200, height: 1200 } : { width: 1800, height: 1200 })!,
            alt: pics.own || pics.back ? `${name}, front` : pics.photo ? `${name}, front and back` : name,
            square: pics.own,
          }
        : null,
      pics.back ? { src: assetUrl(pics.back, { width: 1800, height: 1200 })!, alt: `${name}, back`, square: false } : null,
      // More photos of this colour (a colour with its own pictures never shows another colour's).
      ...pics.gallery.map((id, i) => ({
        src: assetUrl(id, { width: 1200, height: 1200 })!,
        alt: `${name}, photo ${i + 2}`,
        square: true,
      })),
    ];
    return list.filter((g): g is GalleryImage => g !== null);
  };
  const firstColour = colourNames[0] ?? '';
  const galleries = Object.fromEntries((colourNames.length ? colourNames : ['']).map((c) => [c, galleryFor(c || null)]));
  // Each size/colour with the markets it can be made for: Qikink in India, Gelato elsewhere.
  const saleVariants = variants.map((v) => ({ ...v, sellIn: marketsFor(product, v) }));
  // Free delivery is an India offer; a product not made in India (the caps, for now) doesn't mention it.
  const soldInIndia = variants.length ? saleVariants.some((v) => v.sellIn.includes('IN')) : marketsFor(product, null).includes('IN');
  const colours = Object.fromEntries(
    colourNames.map((c) => {
      const pics = imagesFor(product, c);
      const thumb = pics.photo || (pics.own ? pics.mockup : null);
      return [
        c,
        {
          note: product.colorways?.[c]?.note ?? null,
          swatch: product.colorways?.[c]?.swatch ?? null,
          // The cart shows a small square: a photo or square mockup fits it whole.
          image: thumb ? assetUrl(thumb, { width: 400, height: 400 }) : image,
        },
      ];
    }),
  );

  // The specification per colour and market (from the CMS, not Gelato's catalogue).
  const specs: SpecTable = Object.fromEntries(
    (colourNames.length ? colourNames : ['']).map((c) => [c, Object.fromEntries(MARKET_CODES.map((m) => [m, specsFor(product, c || null, m)]))]),
  );

  return (
    <>
      <section className="bg-cream py-12 lg:py-16">
        <Container>
          <Link
            href="/shop"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-mute transition-colors hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="h-3 w-3">
              <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Shop
          </Link>

          <ProductColourProvider initial={firstColour || null}>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* The slider stays in view on wide screens while the details scroll past. */}
            <Reveal className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <ProductGallery galleries={galleries} fallback={firstColour} />
            </Reveal>

            <Reveal delay={100}>
              <h1 className="display text-[clamp(1.875rem,4vw,3rem)]">{product.title}</h1>

              <div className="mt-5">
                <MarketPrice className="text-2xl font-bold" prices={product.prices} price={product.price} currency={currency} />
              </div>

              {product.description && (
                <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-ink-mute">
                  {product.description}
                </p>
              )}

              <div className="mt-8">
                {product.price != null || product.prices ? (
                  <AddToCart
                    item={{
                      slug,
                      title: product.title,
                      gelatoProductUid: product.gelato_product_uid,
                      printFileUrl: product.print_file_url,
                      // The cart shows a small square: the photo fits it whole.
                      image: product.photo ? assetUrl(product.photo, { width: 400, height: 400 }) : image,
                      unitPrice: Number(product.price) || 0,
                      currency,
                      prices: product.prices ?? undefined,
                    }}
                    variants={saleVariants}
                    colours={colours}
                    comingSoon={!shopIsOpen()}
                  />
                ) : (
                  <p className="rounded-2xl border border-ink/12 bg-white px-5 py-4 text-sm text-ink-mute">
                    This item isn’t on sale yet. Join the community and we’ll tell you when it is.
                  </p>
                )}
              </div>

              <dl className="mt-10 space-y-3 border-t border-ink/10 pt-8 text-sm">
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 font-semibold">Shipping</dt>
                  <dd className="text-ink-mute">
                    {soldInIndia
                      ? 'Free in India. Elsewhere, calculated at checkout from your address.'
                      : 'Calculated at checkout from your address.'}
                  </dd>
                </div>
              </dl>

              <ProductSpecs table={specs} fallback={firstColour} />
            </Reveal>
          </div>
          </ProductColourProvider>
        </Container>
      </section>
    </>
  );
}
