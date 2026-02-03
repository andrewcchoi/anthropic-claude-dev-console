'use client';

interface EditorSkeletonProps {
  height?: number | string;
}

/**
 * Loading placeholder shown while Monaco Editor is being dynamically imported
 */
export function EditorSkeleton({ height = 200 }: EditorSkeletonProps) {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className="bg-gray-800 rounded animate-pulse flex items-center justify-center"
      style={{ height: heightStyle }}
    >
      <span className="text-gray-500 text-sm">Loading editor...</span>
    </div>
  );
}
