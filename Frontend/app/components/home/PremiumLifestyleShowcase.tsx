import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Home, ShoppingBasket, Sparkles } from 'lucide-react';

const SHOP_HREF = '/shop';

const LIFESTYLE_CARDS = [
  {
    id: 'home-living',
    title: 'Home & Living',
    subtitle: 'Elevated decor, lighting, and everyday comforts for spaces that feel unmistakably yours.',
    image:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=85&w=1920&auto=format&fit=crop',
    imageAlt: 'Elegant living space with sofa, side table, and warm ambient lighting',
    cta: 'Explore Collection',
    icon: Home,
    accent:
      'from-[#faf8f4] via-[#f5f0e8] to-[#ebe4d8] border-[#e8dfd0]/90 shadow-[0_20px_50px_-24px_rgba(92,83,70,0.18)]',
    iconWrap: 'bg-[#f3ebe0] text-[#6b5c48] ring-[#d4c4a8]/40',
    featured: true,
  },
  {
    id: 'beauty',
    title: 'Beauty',
    subtitle: 'Skincare, color, and fragrance—thoughtfully curated for a refined routine.',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=85&w=900&auto=format&fit=crop',
    imageAlt: 'Luxury beauty products and cosmetics arranged on marble',
    cta: 'Shop Now',
    icon: Sparkles,
    accent:
      'from-[#fdfcfa] via-[#faf6f2] to-[#f3ebe6] border-[#eadfd8]/90 shadow-[0_16px_44px_-22px_rgba(120,90,80,0.14)]',
    iconWrap: 'bg-[#fceee8]/90 text-[#8b5a5a] ring-rose-200/50',
    featured: false,
  },
  {
    id: 'grocery',
    title: 'Grocery',
    subtitle: 'Fresh produce, pantry staples, and everyday essentials—beautifully composed.',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?q=85&w=900&auto=format&fit=crop',
    imageAlt: 'Fresh vegetables and fruits at a market display',
    cta: 'Shop Now',
    icon: ShoppingBasket,
    accent:
      'from-[#fbfbf8] via-[#f4f6f0] to-[#e8ede4] border-[#dde5d8]/90 shadow-[0_16px_44px_-22px_rgba(60,80,55,0.12)]',
    iconWrap: 'bg-[#e8f0e4] text-[#4a5c44] ring-emerald-200/45',
    featured: false,
  },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

export function PremiumLifestyleShowcase() {
  const [featured, ...rest] = LIFESTYLE_CARDS;

  return (
    <section
      className="relative overflow-hidden border-t border-[#ebe6dc]/80 bg-gradient-to-b from-[#fdfcfa] via-[#faf7f2] to-[#f5f2ec] py-16 sm:py-20 lg:py-24"
      aria-labelledby="premium-lifestyle-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(212,175,90,0.07)_0%,transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[15%] top-1/3 h-[min(420px,70vw)] w-[min(420px,70vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,250,240,0.85)_0%,transparent_65%)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[10%] bottom-0 h-[min(380px,65vw)] w-[min(380px,65vw)] rounded-full bg-[radial-gradient(circle,rgba(243,236,224,0.75)_0%,transparent_62%)] blur-3xl"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center sm:mb-14"
          {...fadeUp}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7a62] sm:text-xs">
            Collections
          </p>
          <h2
            id="premium-lifestyle-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-[#2a2620] sm:text-4xl lg:text-[2.35rem] lg:leading-tight"
          >
            Curated for Every Lifestyle
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#5c564c] sm:text-lg">
            Browse elevated collections across home, beauty, and everyday
            essentials.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          <motion.article
            className="min-w-0 lg:col-span-7"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-36px' }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <LifestyleCard card={featured} size="large" />
          </motion.article>

          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:col-span-5 lg:flex lg:flex-col">
            {rest.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-36px' }}
                transition={{
                  duration: 0.45,
                  delay: 0.12 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <LifestyleCard card={card} size="compact" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LifestyleCard({
  card,
  size,
}: {
  card: (typeof LIFESTYLE_CARDS)[number];
  size: 'large' | 'compact';
}) {
  const Icon = card.icon;
  const isLarge = size === 'large';
  const isHomeLivingHero = isLarge && card.id === 'home-living';

  return (
    <div
      className={`group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-28px_rgba(44,39,32,0.2)] ${
        isHomeLivingHero
          ? 'min-h-[min(28rem,78vh)] border-white/35 shadow-[0_24px_56px_-28px_rgba(44,39,32,0.28)] sm:min-h-[min(30rem,76vh)]'
          : `bg-gradient-to-br ${card.accent}`
      }`}
    >
      {isHomeLivingHero && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${card.image})` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/20" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
            aria-hidden
          />
        </>
      )}
      <div
        className={`relative z-10 flex shrink-0 flex-col ${
          isLarge
            ? isHomeLivingHero
              ? 'flex-1 justify-end p-5 pb-4 sm:p-6 sm:pb-5'
              : 'p-6 pb-0 sm:p-8 sm:pb-0'
            : 'p-5 pb-4 sm:p-6 sm:pb-5'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${card.iconWrap} shadow-sm`}
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={1.65} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-bold tracking-tight ${isHomeLivingHero ? 'text-white' : 'text-[#2a2620]'} ${
                isLarge ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
              }`}
            >
              {card.title}
            </h3>
            <p
              className={`mt-2 leading-relaxed ${isHomeLivingHero ? 'text-white/90' : 'text-[#5c564c]'} ${
                isLarge ? 'text-sm sm:text-base' : 'text-sm'
              }`}
            >
              {card.subtitle}
            </p>
          </div>
        </div>

        <div className={isLarge ? 'mt-6' : 'mt-5'}>
          <Link
            to={SHOP_HREF}
            className="inline-flex items-center gap-2 rounded-full border border-[#2a2620]/10 bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#2a2620] shadow-[0_4px_20px_-8px_rgba(44,39,32,0.15)] backdrop-blur-sm transition-all duration-300 hover:border-[#d4a012]/35 hover:bg-white hover:shadow-[0_8px_28px_-10px_rgba(212,160,18,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a012]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf7f2]"
          >
            {card.cta}
            <ArrowRight
              className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>

      {isLarge && !isHomeLivingHero ? (
        <div className="relative z-0 mt-8 w-full shrink-0 px-6 pb-6 sm:mt-9 sm:px-8 sm:pb-8">
          <div className="pointer-events-none absolute -inset-1 rounded-[22px] bg-gradient-to-br from-[#e8dcc8]/35 via-transparent to-[#d4a012]/10 blur-[2px]" aria-hidden />
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-[#f5efe6]/90 to-[#ebe4d8]/80 shadow-[0_12px_32px_-12px_rgba(60,50,38,0.35),0_22px_48px_-18px_rgba(60,50,38,0.28)] ring-1 ring-[#2a2620]/[0.06]">
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#f5f0e8]/40 via-transparent to-[#faf8f4]/15"
              aria-hidden
            />
            <motion.img
              src={card.image}
              alt={card.imageAlt}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
              className="h-[200px] w-full object-cover object-[center_58%] transition-transform duration-[420ms] ease-out will-change-transform group-hover:scale-[1.03] sm:h-[220px] lg:h-[240px]"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      ) : !isLarge ? (
        <div className="relative z-0 mt-auto min-h-0 w-full min-h-[160px] overflow-hidden sm:min-h-[180px]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-16 bg-gradient-to-b from-[#faf7f2]/95 to-transparent sm:h-20"
            aria-hidden
          />
          <img
            src={card.image}
            alt={card.imageAlt}
            className="h-full w-full object-cover object-center transition-transform duration-[380ms] ease-out will-change-transform group-hover:scale-[1.045]"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
    </div>
  );
}
