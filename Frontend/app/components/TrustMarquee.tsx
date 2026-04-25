import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  Headphones,
  Users,
  Lock,
  CheckCircle2,
  Diamond,
} from 'lucide-react';

const trustItems = [
  { text: 'Secure Payments', icon: ShieldCheck },
  { text: 'Fast Delivery', icon: Truck },
  { text: 'Easy Returns', icon: RotateCcw },
  { text: 'Premium Quality', icon: Award },
  { text: '24/7 Support', icon: Headphones },
  { text: 'Trusted by Customers', icon: Users },
  { text: 'Safe Checkout', icon: Lock },
  { text: 'Genuine Products', icon: CheckCircle2 },
];

export function TrustMarquee() {
  const marqueeItems = [...trustItems, ...trustItems];

  return (
    <section className="relative w-full overflow-hidden border-y border-[#C4973F]/30 bg-gradient-to-r from-[#fdf8ec] via-[#f7e7c1] to-[#fdf8ec] py-4 sm:py-5">

      {/* Premium golden glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,151,63,0.15),transparent_70%)]" />

      <style>{`
        @keyframes trust-marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .trust-marquee-track {
          animation: trust-marquee 30s linear infinite;
          will-change: transform;
        }

        .trust-marquee-wrapper:hover .trust-marquee-track {
          animation-play-state: paused;
        }
      `}</style>

      <div className="trust-marquee-wrapper relative flex overflow-hidden">
        <div className="trust-marquee-track flex min-w-max items-center">
          {marqueeItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={`${item.text}-${index}`} className="flex items-center">

                {/* Card */}
                <div className="mx-3 sm:mx-4 md:mx-5 flex items-center gap-2.5 sm:gap-3 rounded-full border border-[#C4973F]/40 bg-gradient-to-br from-[#fff7e3] to-[#f3d9a4] px-4 py-2 shadow-[0_4px_20px_rgba(196,151,63,0.25)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_6px_25px_rgba(196,151,63,0.35)]">

                  {/* Icon */}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4973F]/15">
                    <Icon className="h-3.5 w-3.5 text-[#8B6A2F]" strokeWidth={2} />
                  </span>

                  {/* Text */}
                  <span className="text-[11px] sm:text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.18em] text-[#6f5223] whitespace-nowrap">
                    {item.text}
                  </span>
                </div>

                {/* Diamond divider */}
                <Diamond className="h-3 w-3 flex-shrink-0 text-[#C4973F] fill-[#C4973F]/70" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}