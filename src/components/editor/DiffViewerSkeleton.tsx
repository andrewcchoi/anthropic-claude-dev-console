'use client';

/**
 * Skeleton loading state for DiffViewer
 * Shown while Monaco DiffEditor is loading
 */
export function DiffViewerSkeleton() {
  return (
    <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center">
      <div className="flex gap-2 items-center text-gray-400 text-sm">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading diff viewer...</span>
      </div>
    </div>
  );
}
