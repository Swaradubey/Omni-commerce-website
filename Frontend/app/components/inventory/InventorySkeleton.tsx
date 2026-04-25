import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../ui/skeleton';

const shimmer = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
  },
};

export function InventorySkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 sm:space-y-10"
    >
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-3">
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-10 w-64 max-w-full rounded-xl sm:h-11 sm:w-80" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-28 rounded-2xl sm:w-32" />
          <Skeleton className="h-11 w-36 rounded-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="relative overflow-hidden rounded-[1.125rem] border border-white/70 bg-white/65 p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.04] sm:p-6">
              <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-indigo-200/80 to-violet-200/80 dark:from-indigo-500/30 dark:to-violet-500/30" />
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-2.5 w-20 rounded" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-10 rounded-lg" />
                    <Skeleton className="h-4 w-10 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
              <div className="flex gap-[3px] items-end h-4">
                {Array.from({ length: 10 }).map((_, j) => (
                  <motion.div
                    key={j}
                    variants={shimmer}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: j * 0.1 }}
                  >
                    <Skeleton className="flex-1 w-2 rounded-full" style={{ height: `${(3 + j) * 3}px` }} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-5">
        <div className="rounded-[1.25rem] border border-white/80 bg-white/50 p-4 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.04] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl sm:w-[178px]" />
            <Skeleton className="h-12 w-full rounded-2xl sm:w-[188px]" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/60 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="border-b border-slate-200/70 bg-gradient-to-b from-slate-50/98 to-slate-100/70 px-6 py-4 dark:border-white/[0.08] dark:from-white/[0.05] dark:to-white/[0.02]">
          <div className="flex items-center gap-6">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-16 rounded hidden md:block" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-14 rounded hidden sm:block" />
            <Skeleton className="h-3 w-16 rounded hidden lg:block" />
            <Skeleton className="h-3 w-14 rounded ml-auto" />
          </div>
        </div>
        {/* Table rows */}
        <div className="divide-y divide-gray-100/60 dark:divide-white/[0.03]">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.04 }}
              className="flex items-center gap-4 px-6 py-3.5"
            >
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="h-3.5 w-40 max-w-[60%]" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-5 w-14 rounded-md hidden md:block" />
              <Skeleton className="h-3 w-12 hidden md:block" />
              <Skeleton className="h-3.5 w-10" />
              <Skeleton className="h-3.5 w-10" />
              <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
              <Skeleton className="h-3 w-20 hidden lg:block" />
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
