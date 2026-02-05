'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  error?: string | null;
}

export function RefreshButton({ onRefresh, isRefreshing, error }: RefreshButtonProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const wasRefreshingRef = useRef(false);

  useEffect(() => {
    // Detect transition from refreshing to not refreshing
    if (wasRefreshingRef.current && !isRefreshing && !error) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 2000);
      return () => clearTimeout(timer);
    }
    wasRefreshingRef.current = isRefreshing;
  }, [isRefreshing, error]);

  const iconClass = "w-4 h-4";
  const hasError = !!error;

  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 ${
        hasError
          ? 'text-red-500 dark:text-red-400'
          : justCompleted
          ? 'text-green-500 dark:text-green-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
      title={hasError ? `Error: ${error}` : justCompleted ? 'Refreshed successfully' : 'Refresh sessions'}
    >
      {isRefreshing ? (
        <RefreshCw className={`${iconClass} animate-spin`} />
      ) : justCompleted ? (
        <Check className={iconClass} />
      ) : hasError ? (
        <AlertCircle className={iconClass} />
      ) : (
        <RefreshCw className={iconClass} />
      )}
    </button>
  );
}
