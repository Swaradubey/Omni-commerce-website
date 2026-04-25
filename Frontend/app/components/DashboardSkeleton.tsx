import React from 'react';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';

const skCard =
  'rounded-[1.125rem] border border-white/60 bg-white/55 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/50 border-none';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 sm:space-y-10 animate-pulse">
      <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className={skCard}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5 px-5">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Skeleton className="h-9 w-36 mb-3 rounded-md" />
              <Skeleton className="h-3 w-44 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-7">
        <Card className={`col-span-1 lg:col-span-4 ${skCard}`}>
          <CardHeader className="px-6 pt-6">
            <Skeleton className="h-6 w-48 mb-2 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[350px] flex items-end space-x-2 pb-8 px-8">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${40 + ((i * 17) % 50)}%` }} />
            ))}
          </CardContent>
        </Card>
        <Card className={`col-span-1 lg:col-span-3 ${skCard}`}>
          <CardHeader className="px-6 pt-6">
            <Skeleton className="h-6 w-48 mb-2 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[320px] sm:h-[350px]">
            <Skeleton className="h-48 w-48 rounded-full" />
            <div className="grid grid-cols-2 gap-4 mt-8 w-full px-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={skCard}>
        <CardHeader className="px-6 pt-6">
          <Skeleton className="h-6 w-48 mb-2 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-16 ml-auto rounded-md" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
