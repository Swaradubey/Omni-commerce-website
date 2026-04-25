import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';

/**
 * AnnouncementBar Component
 * 
 * A premium, horizontal scrolling banner for the top of the website.
 * Features:
 * - Infinite loop marquee animation
 * - Premium gold gradient background
 * - Responsive typography
 * - Dismiss functionality with smooth fade-out
 * - Clickable banner area
 */
export const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState(true);

  const announcement = "Click here for 40+ new updates to achieve your business goals";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-[60] w-full bg-[#E6D05A] border-b border-black/5"
        >
          <div className="relative mx-auto flex h-10 items-center overflow-hidden decoration-inherit">
            <Link 
              to="/shop" 
              className="flex w-full items-center justify-center transition-all duration-300 hover:brightness-95 active:scale-[0.99]"
            >
              {/* Marquee Container */}
              <div className="flex whitespace-nowrap">
                <div className="flex animate-marquee items-center pause-on-hover">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center">
                      <span className="mx-6 text-[11px] font-bold uppercase tracking-[0.15em] text-black/80 md:mx-10 md:text-[13px]">
                        {announcement}
                      </span>
                      {/* Decorative Separator */}
                      <span className="h-1 w-1 rounded-full bg-black/20" />
                    </div>
                  ))}
                </div>
              </div>
            </Link>

            {/* Close Button */}
            <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2 md:right-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-black/60 transition-all hover:bg-black/10 hover:text-black focus:outline-none"
                aria-label="Dismiss announcement"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBar;
