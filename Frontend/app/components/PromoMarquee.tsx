import React from 'react';
import { Link } from 'react-router';

interface PromoMarqueeProps {
  text?: string;
  href?: string;
  speed?: string; // e.g., '40s'
}

export const PromoMarquee: React.FC<PromoMarqueeProps> = ({
  text = "Discover new arrivals, exclusive deals, and premium product updates",
  href = "/shop",
  speed = "35s",
}) => {
  // Repeat the text to ensure it covers more than the screen width
  const content = Array(12).fill(text);

  return (
    <Link
      to={href}
      className="group relative block w-full overflow-hidden border-y border-[#C4973F]/20 bg-[#facc15] py-3 transition-all duration-500 hover:bg-[#efbb0d] sm:py-4"
    >
      {/* Premium Gradient Masks for Fade effect */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#facc15] via-[#facc15]/60 to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#facc15] via-[#facc15]/60 to-transparent sm:w-32" />

      <div className="relative flex items-center whitespace-nowrap">
        <div 
          className="flex animate-marquee items-center gap-12 sm:gap-16"
          style={{ animationDuration: speed }}
        >
          {content.map((item, index) => (
            <span
              key={index}
              className="text-sm font-bold uppercase tracking-[0.15em] text-[#111111] sm:text-[15px]"
            >
              {item}
            </span>
          ))}
        </div>
        
        {/* Duplicate set for seamless looping */}
        <div 
          className="flex animate-marquee items-center gap-12 sm:gap-16"
          aria-hidden="true"
          style={{ animationDuration: speed }}
        >
          {content.map((item, index) => (
            <span
              key={index}
              className="text-sm font-bold uppercase tracking-[0.15em] text-[#111111] sm:text-[15px]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Subtle hover indicator or interaction polish */}
      <div className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/5" />
    </Link>
  );
};
