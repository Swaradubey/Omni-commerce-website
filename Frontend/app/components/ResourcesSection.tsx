import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Globe,
  Play,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router';

interface ResourceCard {
  id: string;
  icon: React.ElementType;
  accent: string;
  title: string;
  description: string;
  cta: string;
  href: string;
}

const resourceCards: ResourceCard[] = [
  {
    id: 'reports',
    icon: BarChart3,
    accent: 'from-indigo-500/20 to-indigo-500/5',
    title: 'Built-in ecommerce reports',
    description:
      'Track revenue, customer behavior, and campaign performance with clear analytics designed to support faster and smarter decisions.',
    cta: 'Explore reports',
    href: '/shop',
  },
  {
    id: 'help-center',
    icon: Globe,
    accent: 'from-emerald-500/20 to-emerald-500/5',
    title: 'Help Center in 5 languages',
    description:
      'Access an intuitive support experience with multilingual guidance across features, workflows, and integrations.',
    cta: 'Visit Help Center',
    href: '/dashboard/help-center',
  },
  {
    id: 'tutorials',
    icon: Play,
    accent: 'from-amber-500/20 to-amber-500/5',
    title: 'Step-by-step video tutorials',
    description:
      'Learn through beautifully structured tutorials that guide you from setup basics to advanced growth strategies.',
    cta: 'Watch tutorials',
    href: '/shop',
  },
  {
    id: 'articles',
    icon: FileText,
    accent: 'from-rose-500/20 to-rose-500/5',
    title: '1,500+ marketing articles',
    description:
      'Discover practical insights, proven frameworks, and expert-led resources to scale visibility, sales, and retention.',
    cta: 'Read articles',
    href: '/shop',
  },
];

export interface ResourcesSectionProps {
  className?: string;
}

export function ResourcesSection({ className = '' }: ResourcesSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-10% 0px' });

  const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
  };

  const gridVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.25,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden bg-[#f7f6f3] py-20 sm:py-24 lg:py-32 ${className}`}
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-0 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute right-[-8%] top-12 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-8 lg:mb-20 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="max-w-3xl"
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-black/10 bg-white/70 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">
                Resources
              </span>
            </div>

            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#111111] sm:text-4xl lg:text-6xl lg:leading-[1.05]">
              Resources to make better
              <span className="block">business decisions</span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f5f5f] sm:text-base sm:leading-8">
              Explore expert-led tools, guides, and learning materials designed
              to help you grow with more clarity, confidence, and control.
            </p>
          </motion.div>

          <motion.div
            custom={0.15}
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="shrink-0"
          >
            <Link
              to="/shop"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#111111] px-7 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Cards */}
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-7"
        >
          {resourceCards.map((card) => {
            const Icon = card.icon;

            return (
              <motion.div key={card.id} variants={cardVariants}>
                <Link
                  to={card.href}
                  className="group relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] border border-black/6 bg-white/85 p-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-black/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)] sm:p-8"
                >
                  {/* Accent glow */}
                  <div
                    className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${card.accent} opacity-80 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                  />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-black/6 bg-[#f8f8f6] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-white">
                      <Icon className="h-6 w-6 text-[#111111]" />
                    </div>

                    {/* Content */}
                    <h3 className="mt-8 max-w-[16rem] text-[1.45rem] font-semibold leading-[1.2] tracking-[-0.03em] text-[#111111]">
                      {card.title}
                    </h3>

                    <p className="mt-4 text-[15px] leading-7 text-[#5f5f5f]">
                      {card.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="relative z-10 mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#111111]">
                    <span className="transition-colors duration-300 group-hover:text-black">
                      {card.cta}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </div>

                  {/* Hover border glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-transparent transition-all duration-500 group-hover:ring-black/8" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}