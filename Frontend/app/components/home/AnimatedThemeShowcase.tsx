import React, { useRef, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { motion, useInView } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { products as staticProducts } from '../../data/products';

export type ShowcaseProduct = {
  image?: string;
  name?: string;
  price?: number;
  salePrice?: number;
};

type ThemeCardData = {
  id: string;
  name: string;
  tagline: string;
  heroFrom: string;
  heroTo: string;
  chips: string[];
  slot:
    | 'xl-edge-left'
    | 'back-left'
    | 'side-left'
    | 'center'
    | 'side-right'
    | 'back-right'
    | 'xl-edge-right';
};

const themes: ThemeCardData[] = [
  {
    id: 'terra',
    name: 'Terra Craft',
    tagline: 'Earth tones & tactile grids',
    heroFrom: 'from-[#e7d7b1]',
    heroTo: 'to-[#c89b3c]',
    chips: ['Home', 'Gifts'],
    slot: 'xl-edge-left',
  },
  {
    id: 'soft',
    name: 'Soft Luxe',
    tagline: 'Velvet accents & serif type',
    heroFrom: 'from-[#f3ead8]',
    heroTo: 'to-[#dcc9a4]',
    chips: ['Beauty', 'Care'],
    slot: 'back-left',
  },
  {
    id: 'nordic',
    name: 'Nordic Minimal',
    tagline: 'Calm whitespace, sharp catalog',
    heroFrom: 'from-neutral-100',
    heroTo: 'to-neutral-300/90',
    chips: ['Tech', 'Desk'],
    slot: 'side-left',
  },
  {
    id: 'atelier',
    name: 'Atelier Spotlight',
    tagline: 'Editorial hero & curated picks',
    heroFrom: 'from-[#f3ead8]',
    heroTo: 'to-[#c89b3c]/80',
    chips: ['New', "Editor's pick"],
    slot: 'center',
  },
  {
    id: 'golden',
    name: 'Golden Boutique',
    tagline: 'Warm metallics & soft ribbons',
    heroFrom: 'from-[#fdf6e8]',
    heroTo: 'to-[#e7d7b1]',
    chips: ['Jewelry', 'Limited'],
    slot: 'side-right',
  },
  {
    id: 'urban',
    name: 'Urban Studio',
    tagline: 'Bold blocks & street energy',
    heroFrom: 'from-neutral-200',
    heroTo: 'to-neutral-400/80',
    chips: ['Street', 'Audio'],
    slot: 'back-right',
  },
  {
    id: 'silk',
    name: 'Silk & Stone',
    tagline: 'Layered textures, soft contrast',
    heroFrom: 'from-[#f8f4ea]',
    heroTo: 'to-[#d4c4a8]',
    chips: ['Lifestyle', 'Slow'],
    slot: 'xl-edge-right',
  },
];

const slotClass: Record<ThemeCardData['slot'], string> = {
  'xl-edge-left':
    'hidden xl:flex absolute z-[5] left-3 2xl:left-8 top-1/2 -translate-y-1/2 w-[180px] xl:w-[188px] 2xl:w-[208px] -rotate-5 scale-[0.92] opacity-[0.82]',
  'back-left':
    'hidden lg:flex absolute z-10 left-[4%] md:left-[5%] xl:left-[9%] top-[18%] md:top-[20%] w-[180px] md:w-[200px] xl:w-[228px] -rotate-1 scale-[0.96] opacity-[0.88]',
  'side-left':
    'hidden lg:flex absolute z-[15] left-3 md:left-4 lg:left-8 xl:left-12 top-8 md:top-10 lg:top-12 w-[200px] md:w-[220px] xl:w-[240px] -rotate-2',
  center:
    'relative z-30 w-[min(100%,280px)] sm:w-[min(100%,300px)] md:w-[min(100%,340px)] lg:w-[min(100%,380px)] xl:w-[min(100%,400px)]',
  'side-right':
    'hidden lg:flex absolute z-[15] right-3 md:right-4 lg:right-8 xl:right-12 top-8 md:top-10 lg:top-12 w-[200px] md:w-[220px] xl:w-[240px] rotate-2',
  'back-right':
    'hidden lg:flex absolute z-10 right-[4%] md:right-[5%] xl:right-[9%] top-[16%] xl:top-[18%] w-[180px] md:w-[200px] xl:w-[228px] rotate-1 scale-[0.96] opacity-[0.88]',
  'xl-edge-right':
    'hidden xl:flex absolute z-[5] right-3 2xl:right-8 top-1/2 -translate-y-1/2 w-[180px] xl:w-[188px] 2xl:w-[208px] rotate-5 scale-[0.92] opacity-[0.82]',
};

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

function pickDisplayPrice(p: ShowcaseProduct): string | null {
  if (
    typeof p.salePrice === 'number' &&
    typeof p.price === 'number' &&
    p.salePrice < p.price
  ) {
    return money(p.salePrice);
  }
  if (typeof p.price === 'number') return money(p.price);
  return null;
}

function resolveProductPool(featured?: ShowcaseProduct[]): ShowcaseProduct[] {
  const fromProps = (featured ?? []).filter((p) => p && typeof p === 'object');
  const fromStatic: ShowcaseProduct[] = staticProducts.map((p) => ({
    image: p.image,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice,
  }));
  const seen = new Set<string>();
  const out: ShowcaseProduct[] = [];
  for (const p of [...fromProps, ...fromStatic]) {
    const url = p.image?.trim();
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ ...p, image: url });
  }
  return out;
}

type SlotKind = 'center' | 'side' | 'back' | 'edge';

function slotKind(slot: ThemeCardData['slot']): SlotKind {
  if (slot === 'center') return 'center';
  if (slot.startsWith('xl')) return 'edge';
  if (slot.startsWith('back')) return 'back';
  return 'side';
}

function sliceForTheme(
  pool: ShowcaseProduct[],
  themeIndex: number,
  kind: SlotKind
): { hero: ShowcaseProduct | null; grid: ShowcaseProduct[] } {
  const n = pool.length;
  if (n === 0) return { hero: null, grid: [] };
  const stride = kind === 'center' ? 6 : kind === 'side' ? 5 : 4;
  const base = (themeIndex * stride) % n;
  const hero = pool[base] ?? null;
  const gridCount = kind === 'center' || kind === 'side' ? 4 : 2;
  const grid: ShowcaseProduct[] = [];
  for (let i = 0; i < gridCount; i++) {
    grid.push(pool[(base + 1 + i) % n]);
  }
  return { hero, grid };
}

function SafeProductImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-[#f3ead8] via-[#f8f6f1] to-neutral-200/90 ${className ?? ''}`}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={imgClassName}
    />
  );
}

function MiniStorefrontCard({
  theme,
  className,
  index,
  isInView,
  heroProduct,
  gridProducts,
  layout,
}: {
  theme: ThemeCardData;
  className: string;
  index: number;
  isInView: boolean;
  heroProduct: ShowcaseProduct | null;
  gridProducts: ShowcaseProduct[];
  layout: SlotKind;
}) {
  const showGridLabels = layout === 'center' || layout === 'side';
  const heroAspect =
    layout === 'center'
      ? 'aspect-[4/3]'
      : layout === 'edge'
        ? 'aspect-[3/4]'
        : layout === 'back'
          ? 'aspect-[5/4]'
          : 'aspect-[4/3]';

  return (
    <motion.article
      layout={false}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            delay: 0.06 * index,
            duration: 0.55,
            ease: [0.21, 0.47, 0.32, 0.98],
          },
        },
      }}
      className={`group flex max-w-full flex-col overflow-hidden rounded-[1.75rem] border border-[#E8DCC8]/80 bg-white/[0.82] shadow-[0_20px_50px_-24px_rgba(92,83,70,0.18),0_8px_24px_-16px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] ring-1 ring-white/60 hover:-translate-y-1 hover:shadow-[0_28px_56px_-20px_rgba(92,83,70,0.2),0_12px_32px_-14px_rgba(0,0,0,0.06)] ${
        layout === 'center'
          ? 'border-[#D4AF37]/28 shadow-[0_28px_60px_-18px_rgba(180,140,50,0.2),0_12px_36px_-12px_rgba(0,0,0,0.06)] ring-[#E7C870]/15 hover:border-[#D4AF37]/38 hover:shadow-[0_34px_68px_-16px_rgba(200,160,60,0.22),0_16px_40px_-12px_rgba(0,0,0,0.07)]'
          : ''
      } ${className}`}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#E8DCC8]/40 bg-gradient-to-r from-[#FDFAF5]/95 to-white/90 px-3.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]/80 ring-1 ring-[#E7C870]/35" aria-hidden />
        <span className="h-1.5 w-1.5 rounded-full bg-[#F0E4CC]/95" aria-hidden />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-200/95" aria-hidden />
        <span className="ml-auto truncate text-[10px] font-semibold tracking-wide text-neutral-600/90">
          {theme.name}
        </span>
      </div>
      <div className="space-y-3.5 p-3.5 pb-4 sm:p-4 sm:pb-4.5">
        <div
          className={`relative overflow-hidden rounded-[1.125rem] bg-gradient-to-br ring-1 ring-black/[0.035] ${theme.heroFrom} ${theme.heroTo} shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${heroAspect}`}
        >
          <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden rounded-[1.125rem] bg-[#FAF7F2]">
            <SafeProductImage
              src={heroProduct?.image}
              alt={heroProduct?.name ?? theme.name}
              className="h-full w-full"
              imgClassName="h-full w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-[1.125rem] bg-gradient-to-t from-black/45 via-black/10 to-transparent"
            aria-hidden
          />
          <div className="relative z-[2] flex h-full min-h-0 flex-col justify-end p-3 sm:p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              {theme.name}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-white/92 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              {theme.tagline}
            </p>
            {layout === 'center' && heroProduct && pickDisplayPrice(heroProduct) && (
              <p className="mt-2 inline-flex w-fit rounded-full bg-white/22 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-[6px]">
                From {pickDisplayPrice(heroProduct)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {gridProducts.map((p, i) => (
            <div
              key={`${theme.id}-g-${i}`}
              className="group/tile relative aspect-square overflow-hidden rounded-[0.75rem] border border-[#EDE4D6]/90 bg-[#FAF7F2] p-1.5 shadow-[0_4px_14px_-6px_rgba(92,83,70,0.12)] ring-1 ring-black/[0.03]"
            >
              <SafeProductImage
                src={p.image}
                alt={p.name ?? 'Product'}
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.5rem] bg-[#F5F0E8]/80"
                imgClassName="max-h-full max-w-full object-contain object-center transition-transform duration-500 ease-out group-hover/tile:scale-[1.02]"
              />
              {showGridLabels && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[0.5rem] bg-gradient-to-t from-black/55 via-black/20 to-transparent px-1.5 pb-1.5 pt-5">
                  {p.name && (
                    <p className="truncate text-[9px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                      {p.name}
                    </p>
                  )}
                  {pickDisplayPrice(p) && (
                    <p className="text-[9px] font-medium text-white/92">
                      {pickDisplayPrice(p)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {theme.chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-[#E0D4C2]/90 bg-[#FDFAF5]/95 px-2.5 py-0.5 text-[10px] font-medium text-neutral-700/85"
            >
              {c}
            </span>
          ))}
        </div>
        <Link
          to="/shop"
          className="block w-full rounded-full border border-[#C9A227]/35 bg-gradient-to-b from-[#c4a02a] to-[#9a7318] py-2.5 text-center text-xs font-semibold tracking-wide text-white shadow-[0_6px_20px_-8px_rgba(154,115,24,0.45),0_2px_8px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_10px_28px_-6px_rgba(154,115,24,0.42),0_4px_12px_-4px_rgba(0,0,0,0.06)] hover:brightness-[1.02] active:scale-[0.99]"
        >
          Preview Layout
        </Link>
      </div>
    </motion.article>
  );
}

export type AnimatedThemeShowcaseProps = {
  featuredProducts?: ShowcaseProduct[];
};

export function AnimatedThemeShowcase({
  featuredProducts,
}: AnimatedThemeShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-12% 0px' });

  const productPool = useMemo(
    () => resolveProductPool(featuredProducts),
    [featuredProducts]
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="theme-showcase-heading"
      className="relative isolate z-0 mt-12 w-full overflow-x-hidden py-20 sm:mt-14 sm:py-24 md:py-28 lg:mt-16 lg:py-32"
    >
      {/* Background: clip decorative layers only so floating cards are not cut off */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#FCFAF6] via-[#F8F1E4] to-[#F0E6D4]"
          aria-hidden
        />
        <div
          className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[min(90vw,640px)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(231,200,112,0.28)_0%,transparent_68%)] blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -right-[15%] bottom-0 h-[min(55vh,420px)] w-[min(75vw,520px)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.14)_0%,transparent_72%)] blur-[64px]"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#D8C49A]/22 to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mb-14 text-center md:mb-16 lg:mb-[4.25rem]"
        >
          <span className="inline-flex items-center justify-center rounded-full border border-[#DCC9A8]/55 bg-white/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#5C5346] shadow-[0_8px_28px_-18px_rgba(92,83,70,0.15)] backdrop-blur-sm sm:text-[11px]">
            Customizable Themes
          </span>
          <h2
            id="theme-showcase-heading"
            className="mx-auto mt-8 max-w-4xl text-balance text-[1.85rem] font-semibold leading-[1.18] tracking-[-0.02em] text-[#1c1915] sm:text-4xl sm:leading-[1.14] md:text-[2.65rem] md:leading-[1.1] lg:text-[3.1rem]"
          >
            Explore{' '}
            <span className="bg-gradient-to-r from-[#7A6220] via-[#B08A2E] to-[#5C4A1E] bg-clip-text text-transparent">
              Beautiful
            </span>{' '}
            Store Layouts
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-neutral-600/95 md:text-base md:leading-relaxed">
            Discover premium storefront experiences with elegant layouts, curated
            product highlights, and modern shopping interactions.
          </p>
          <Link
            to="/shop"
            className="group/cta mt-11 inline-flex items-center gap-2.5 rounded-full border border-[#D4B87A]/50 bg-gradient-to-b from-white to-[#FAF5EC] px-5 py-3 text-sm font-semibold tracking-wide text-[#1c1915] shadow-[0_8px_28px_-10px_rgba(92,83,70,0.2),0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#C9A227]/45 hover:shadow-[0_14px_36px_-12px_rgba(180,140,50,0.28),0_4px_14px_-4px_rgba(0,0,0,0.07)] active:translate-y-0 sm:px-9 sm:py-3.5"
          >
            View Collections
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </motion.div>

        <div className="relative mt-12 min-h-[400px] md:min-h-[540px] lg:mt-14 lg:min-h-[640px]">
          <div className="relative flex min-h-0 snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-3 sm:px-4 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {themes.map((theme, i) => {
              const { hero, grid } = sliceForTheme(
                productPool,
                i,
                slotKind(theme.slot)
              );
              return (
                <div
                  key={`scroll-${theme.id}`}
                  className="min-w-[85%] sm:min-w-[72%] shrink-0 snap-center snap-always"
                >
                  <MiniStorefrontCard
                    theme={theme}
                    className="w-full"
                    index={i}
                    isInView={isInView}
                    heroProduct={hero}
                    gridProducts={grid}
                    layout={slotKind(theme.slot)}
                  />
                </div>
              );
            })}
          </div>

          <div className="relative hidden min-h-0 flex-col items-center justify-center overflow-visible px-2 sm:px-4 lg:flex">
            <div className="relative flex w-full max-w-[min(100%,68rem)] items-center justify-center py-4">
              {[...themes]
                .sort((a, b) => {
                  const order: ThemeCardData['slot'][] = [
                    'xl-edge-left',
                    'back-left',
                    'side-left',
                    'center',
                    'side-right',
                    'back-right',
                    'xl-edge-right',
                  ];
                  return order.indexOf(a.slot) - order.indexOf(b.slot);
                })
                .map((theme) => {
                  const originalIndex = themes.findIndex((t) => t.id === theme.id);
                  const kind = slotKind(theme.slot);
                  const { hero, grid } = sliceForTheme(
                    productPool,
                    originalIndex,
                    kind
                  );
                  return (
                    <MiniStorefrontCard
                      key={theme.id}
                      theme={theme}
                      className={slotClass[theme.slot]}
                      index={originalIndex}
                      isInView={isInView}
                      heroProduct={hero}
                      gridProducts={grid}
                      layout={kind}
                    />
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnimatedThemeShowcase;
