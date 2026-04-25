import React from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Footprints, Headphones, Sparkles, Watch } from 'lucide-react';

const MOBILE_PRODUCTS = [
  {
    name: 'Studio Headphones',
    price: '$249',
    Icon: Headphones,
    thumbClass:
      'bg-gradient-to-br from-amber-100/95 via-orange-50/90 to-[#f4e4d4] text-[#5c4030]',
  },
  {
    name: 'Classic Sneakers',
    price: '$189',
    Icon: Footprints,
    thumbClass:
      'bg-gradient-to-br from-stone-100/95 via-zinc-50/90 to-[#ebe8e4] text-[#4a423c]',
  },
  {
    name: 'Smart Watch Pro',
    price: '$329',
    Icon: Watch,
    thumbClass:
      'bg-gradient-to-br from-sky-50/95 via-blue-50/80 to-indigo-50/70 text-[#3d4f5c]',
  },
] as const;

/** Premium smartphone mockup with in-app product cards — scales with container, no external images. */
function OmniCommerceMobileMockup({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto flex min-h-0 w-full max-w-full flex-col items-center justify-center overflow-hidden ${className}`}
      role="img"
      aria-label="Mobile shopping app preview with product listings"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[45%] z-0 h-[min(340px,90%)] w-[min(130%,300px)] -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-[radial-gradient(circle,rgba(255,255,255,0.48)_0%,rgba(255,248,240,0.12)_45%,transparent_68%)] blur-2xl"
        aria-hidden
      />
      <motion.div
        className="relative z-[1] w-full max-w-[min(220px,52vw)] origin-center sm:max-w-[240px] lg:max-w-[260px]"
        initial={{ opacity: 0, y: 20, rotate: 2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 3 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{
          y: -6,
          scale: 1.025,
          rotate: 2,
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <div className="drop-shadow-[0_28px_52px_-10px_rgba(28,20,14,0.42)]">
          <div className="rounded-[2.25rem] bg-gradient-to-b from-[#3d3834] via-[#262320] to-[#12100e] p-[10px] shadow-[0_20px_36px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/18">
            <div
              className="mx-auto mb-2 flex h-[18px] w-[4.75rem] items-center justify-center rounded-full bg-black/55 ring-1 ring-white/10"
              aria-hidden
            >
              <span className="h-1 w-7 rounded-full bg-black/45" />
            </div>
            <div className="max-h-[min(320px,calc(45vh-4rem))] overflow-hidden rounded-[1.35rem] bg-[#ebe4da] shadow-[inset_0_2px_12px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-[#2c241c]/[0.07] bg-white/75 px-3 py-2 backdrop-blur-[2px]">
                <span className="text-[9px] font-bold tracking-tight text-[#2e2823] sm:text-[10px]">
                  Shop
                </span>
                <div className="flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/90" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/95" />
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500/85" />
                </div>
              </div>
              <div className="space-y-2 p-2.5 pb-3">
                {MOBILE_PRODUCTS.map(({ name, price, Icon, thumbClass }) => (
                  <div
                    key={name}
                    className="flex gap-2 rounded-xl border border-[#2c241c]/[0.06] bg-white/95 p-2 shadow-[0_4px_14px_-4px_rgba(44,36,28,0.12)]"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] ${thumbClass}`}
                    >
                      <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.85} aria-hidden />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <p className="truncate text-[10px] font-semibold leading-tight text-[#1f1c18] sm:text-[11px]">
                        {name}
                      </p>
                      <p className="text-[11px] font-bold tabular-nums tracking-tight text-[#8f7238] sm:text-xs">
                        {price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export interface PremiumOmniPromoBannerProps {
  className?: string;
  label?: string;
  headline?: string;
  subtext?: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export function PremiumOmniPromoBanner({
  className = '',
  label = 'Smart commerce experience',
  headline = 'Power your store with modern retail experiences',
  subtext = 'Discover premium tools, curated collections, and seamless commerce workflows built to scale.',
  ctaLabel = 'Explore now',
  ctaTo = '/shop',
}: PremiumOmniPromoBannerProps) {
  return (
    <section
      className={`relative overflow-hidden ${className}`}
      aria-labelledby="premium-omni-promo-heading"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="group relative overflow-hidden rounded-[22px] border border-[#e8dfd4]/80 bg-white/40 shadow-[0_28px_72px_-32px_rgba(44,39,32,0.28),0_0_0_1px_rgba(255,255,255,0.65)_inset] backdrop-blur-[2px] transition-[box-shadow,transform] duration-500 ease-out sm:rounded-[26px] lg:rounded-[28px] lg:shadow-[0_36px_88px_-36px_rgba(44,39,32,0.32),0_0_0_1px_rgba(255,255,255,0.7)_inset] hover:-translate-y-0.5 hover:shadow-[0_40px_96px_-32px_rgba(44,39,32,0.36),0_0_0_1px_rgba(255,255,255,0.75)_inset]"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-64px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid min-h-0 grid-cols-1 lg:grid-cols-2 lg:min-h-[min(420px,70vh)]">
            {/* Visual — left */}
            <div className="relative isolate order-2 flex min-h-[260px] items-center justify-center overflow-hidden sm:min-h-[300px] lg:order-1 lg:min-h-full">
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#e8a598] via-[#e8b87a] to-[#c9a06e]"
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_20%_15%,rgba(255,248,240,0.45)_0%,transparent_55%)]"
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_75%,rgba(180,90,70,0.18)_0%,transparent_50%)]"
                aria-hidden
              />
              <div
                className="absolute -left-[20%] top-1/2 h-[120%] w-[70%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,235,220,0.35)_0%,transparent_68%)] blur-3xl"
                aria-hidden
              />
              <div
                className="absolute bottom-[-15%] right-[-10%] h-[55%] w-[55%] rounded-full border border-white/15 bg-white/5 blur-2xl"
                aria-hidden
              />

              {/* Focal art — padded, contained, never overflows rounded card */}
              <div className="relative z-[1] flex w-full max-w-full flex-col items-center justify-center px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12 lg:px-12 lg:pb-12 lg:pt-14">
                <div className="relative w-full max-w-[min(100%,420px)]">
                  <div
                    className="pointer-events-none absolute inset-[-8%] rounded-[40%] bg-[radial-gradient(circle,rgba(255,255,255,0.35)_0%,transparent_62%)] blur-2xl"
                    aria-hidden
                  />
                  <OmniCommerceMobileMockup className="relative mx-auto max-h-[min(340px,45vh)] w-full sm:max-h-[min(360px,42vh)] lg:max-h-[min(380px,48vh)]" />
                </div>
              </div>

              <div className="absolute right-4 top-4 z-[2] flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3d2a22] shadow-sm backdrop-blur-md sm:right-6 sm:top-6 sm:text-[11px]">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#5c3d2e]" aria-hidden />
                Omni retail
              </div>
            </div>

            {/* Copy — right */}
            <div className="relative order-1 flex flex-col justify-center bg-gradient-to-br from-[#fefdfb] via-[#faf6f0] to-[#f0e8dc] px-7 py-10 sm:px-10 sm:py-12 lg:order-2 lg:px-12 lg:py-14 xl:px-14">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_100%_0%,rgba(216,177,90,0.08)_0%,transparent_55%)]"
                aria-hidden
              />
              <div className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#7a6b5a] sm:text-xs">
                  {label}
                </p>
                <h2
                  id="premium-omni-promo-heading"
                  className="mt-4 max-w-[20ch] text-balance text-2xl font-bold leading-[1.12] tracking-tight text-[#1f1c18] sm:text-3xl sm:leading-[1.1] lg:text-[2.35rem] lg:leading-[1.08] xl:text-[2.55rem]"
                >
                  {headline}
                </h2>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5c534a] sm:mt-6 sm:text-[1.05rem] sm:leading-relaxed">
                  {subtext}
                </p>
                <div className="mt-8 sm:mt-10">
                  <Link
                    to={ctaTo}
                    className="group/btn inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a2520] to-[#3d342c] px-8 py-3.5 text-base font-semibold text-[#faf7f2] shadow-[0_12px_36px_-12px_rgba(44,39,32,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_rgba(44,39,32,0.5)] active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a06e]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf6f0]"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
