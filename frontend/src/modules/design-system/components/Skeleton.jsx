import React from 'react';

/**
 * Reusable Skeleton Shimmer Components (Prompt 86 / Screen 25)
 * Provides animated placeholders for data loading states across the platform.
 */

export const Skeleton = ({ className = '', rounded = 'rounded-md', ...props }) => (
  <div
    className={`bg-[#E8E6FE]/50 animate-pulse ${rounded} ${className}`}
    {...props}
  />
);

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2.5 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-3.5 ${
          i === lines - 1 ? 'w-3/5' : i === 0 ? 'w-full' : 'w-5/6'
        }`}
      />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };
  return (
    <Skeleton
      rounded="rounded-full"
      className={`${sizeMap[size] || sizeMap.md} flex-shrink-0 ${className}`}
    />
  );
};

export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-xl border border-border-subtle p-5 space-y-4 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="sm" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="space-y-2 pt-1">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-20 rounded-md" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`w-full bg-white rounded-xl border border-border-subtle overflow-hidden ${className}`}>
    {/* Table Header */}
    <div className="grid grid-cols-4 gap-4 px-6 py-3.5 bg-canvas-main border-b border-border-subtle">
      {Array.from({ length: cols }).map((_, idx) => (
        <Skeleton key={idx} className="h-3.5 w-24" />
      ))}
    </div>
    {/* Table Rows */}
    <div className="divide-y divide-border-subtle/60">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="grid grid-cols-4 gap-4 px-6 py-4 items-center">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="sm" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="flex justify-end">
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;

