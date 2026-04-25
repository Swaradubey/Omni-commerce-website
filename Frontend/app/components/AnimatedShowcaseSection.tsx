import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export interface ShowcaseItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  href: string;
}

export interface AnimatedShowcaseSectionProps {
  heading?: string;
  ctaText?: string;
  ctaHref?: string;
  items: ShowcaseItem[];
  className?: string;
}

export function AnimatedShowcaseSection({
  heading = "Explore a curated collection of standout products",
  ctaText = "Shop the Collection",
  ctaHref = "/shop",
  items,
  className = "",
}: AnimatedShowcaseSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-10% 0px" });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 90,
        damping: 22,
        mass: 1
      }
    },
  };

  const headingVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] as any }
    },
  };

  const ctaVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.3, ease: "easeOut" as const }
    },
  };

  return (
    <section
      className={`py-20 md:py-28 lg:py-36 bg-[#f7f7f5] ${className}`}
      ref={containerRef}
    >
      <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 lg:mb-24">
          <motion.div
            className="max-w-2xl"
            variants={headingVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-[#C4973F]/40 bg-[#C4973F]/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-[12p] font-bold uppercase tracking-[0.24em] text-[#C4973F]">
                Curated Collection
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-[#111111] leading-[1.02]">
              {heading}
            </h2>
          </motion.div>

          <motion.div
            variants={ctaVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="flex-shrink-0"
          >
            <Link
              to={ctaHref}
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#111111] text-white rounded-full font-bold text-sm shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:bg-black hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] hover:-translate-y-1 transition-all duration-300 active:scale-95"
            >
              {ctaText}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Responsive Card Layout */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {items.map((item) => (
            <motion.div key={item.id} variants={itemVariants} className="w-full">
              <Link
                to={item.href}
                className="group relative block w-full aspect-[4/5] rounded-[32px] overflow-hidden bg-white border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)] transition-all duration-500 will-change-transform"
              >
                {/* Image Layer */}
                <div className="absolute inset-0 w-full h-full transform transition-transform duration-1000 ease-out group-hover:scale-105">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle dark overlay for contrast */}
                  <div className="absolute inset-0 bg-[#111111]/20 transition-opacity duration-500 group-hover:opacity-40" />
                </div>

                {/* Glassmorphism Content Overlay */}
                <div className="absolute inset-x-4 bottom-4 p-6 sm:p-7 rounded-[24px] bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex flex-col justify-end transition-all duration-500 group-hover:bg-white/20 group-hover:bottom-5 group-hover:inset-x-5">
                  <div className="relative z-10 transform transition-transform duration-500 ease-out translate-y-2 group-hover:translate-y-0">
                    {item.subtitle && (
                      <span className="inline-block px-3 py-1 mb-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] sm:text-[11px] text-white font-bold uppercase tracking-[0.2em]">
                        {item.subtitle}
                      </span>
                    )}
                    <h3 className="text-white text-2xl sm:text-3xl font-bold leading-[1.1] tracking-tight mb-4">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                      Explore <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>

                {/* Premium border shine effect */}
                <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-black/5 group-hover:ring-black/10 transition-all duration-500" />
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
