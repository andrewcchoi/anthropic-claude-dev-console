'use client';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function RefreshButton({ onRefresh, isRefreshing }: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-50"
      title="Refresh sessions"
    >
      <svg
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
