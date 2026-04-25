import React from 'react';
import { Check, CircleDot, Circle } from 'lucide-react';
import { cn } from '../ui/utils';

export type TimelineStage = {
  step: number;
  label: string;
  status: 'complete' | 'current' | 'pending';
};

type Props = {
  stages: TimelineStage[];
  /** Light = default for storefront tracking; dark kept for contrast surfaces if needed. */
  variant?: 'light' | 'dark';
};

export function OrderTrackingTimeline({ stages, variant = 'light' }: Props) {
  const isDark = variant === 'dark';

  return (
    <ol className="space-y-0">
      {stages.map((s, i) => {
        const isLast = i === stages.length - 1;
        return (
          <li
            key={s.step}
            className="grid grid-cols-[minmax(2.75rem,auto)_1fr] gap-3 sm:grid-cols-[3.25rem_1fr] sm:gap-5"
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-colors sm:h-10 sm:w-10',
                  s.status === 'complete' &&
                    (isDark
                      ? 'border-emerald-400/80 bg-emerald-500/15 text-emerald-300 shadow-[0_0_16px_-4px_rgba(52,211,153,0.45)]'
                      : 'border-emerald-500/90 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-900/10'),
                  s.status === 'current' &&
                    (isDark
                      ? 'border-blue-400/80 bg-blue-500/15 text-blue-300 shadow-[0_0_18px_-4px_rgba(59,130,246,0.4)]'
                      : 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-900/10 ring-2 ring-blue-100'),
                  s.status === 'pending' &&
                    (isDark
                      ? 'border-white/10 bg-[#12141a] text-white/25'
                      : 'border-stone-200 bg-stone-50 text-stone-400')
                )}
              >
                {s.status === 'complete' ? (
                  <Check className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.5} />
                ) : s.status === 'current' ? (
                  <CircleDot className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                ) : (
                  <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </span>
              {!isLast && (
                <div
                  className={cn(
                    'mt-2 w-px flex-1 min-h-[1.75rem] sm:min-h-[2.25rem]',
                    isDark ? 'bg-white/12' : 'bg-stone-200'
                  )}
                  aria-hidden
                />
              )}
            </div>
            <div className={cn('min-w-0 pt-0.5', !isLast && 'pb-10 sm:pb-12')}>
              <p
                className={cn(
                  'text-sm font-semibold leading-snug tracking-tight sm:text-[15px]',
                  s.status === 'pending' && (isDark ? 'text-white/35' : 'text-stone-400'),
                  s.status === 'current' && (isDark ? 'text-white' : 'text-stone-900'),
                  s.status === 'complete' && (isDark ? 'text-white/90' : 'text-stone-800')
                )}
              >
                {s.label}
              </p>
              <p
                className={cn(
                  'mt-1 text-xs sm:text-[13px]',
                  isDark ? 'text-white/40' : 'text-stone-500'
                )}
              >
                {s.status === 'complete' && 'Completed'}
                {s.status === 'current' && 'In progress'}
                {s.status === 'pending' && 'Upcoming'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
