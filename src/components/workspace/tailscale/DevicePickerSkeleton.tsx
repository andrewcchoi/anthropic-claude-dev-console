/**
 * DevicePickerSkeleton Component
 * Loading skeleton for TailscaleDevicePicker
 */

'use client';

import { cn } from '@/lib/utils/cn';

interface DevicePickerSkeletonProps {
  count?: number;
  className?: string;
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      {/* OS Icon skeleton */}
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />

      <div className="flex-1 min-w-0">
        {/* Hostname skeleton */}
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1.5" />
        {/* DNS name skeleton */}
        <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>

      {/* Status indicator skeleton */}
      <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  );
}

export function DevicePickerSkeleton({ count = 3, className }: DevicePickerSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700',
        className
      )}
      role="status"
      aria-label="Loading devices..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  );
}
