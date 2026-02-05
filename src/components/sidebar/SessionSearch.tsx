'use client';

import { useSessionDiscoveryStore } from '@/lib/store/sessions';

export function SessionSearch() {
  const { sessionSearchQuery, setSessionSearchQuery } = useSessionDiscoveryStore();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionSearchQuery(e.target.value);
  };

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={sessionSearchQuery}
        onChange={handleSearch}
        placeholder="Search sessions..."
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      {sessionSearchQuery && (
        <button
          onClick={() => setSessionSearchQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
