'use client';

import { useChatStore } from '@/lib/store';
import { useState } from 'react';

export function UsageDisplay() {
  const { sessionUsage } = useChatStore();
  const [expanded, setExpanded] = useState(false);

  if (!sessionUsage) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
        No usage data yet
      </div>
    );
  }

  const formatCost = (cost: number) => {
    if (cost === 0) return '$0.00';
    if (cost < 0.0001) return `$${cost.toFixed(6)}`;
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens === 0) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const totalTokens = sessionUsage.inputTokens + sessionUsage.outputTokens;

  return (
    <div
      data-usage-display
      className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-xs font-mono text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              {formatCost(sessionUsage.totalCost)}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {formatTokens(totalTokens)} tokens
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {sessionUsage.requestCount} {sessionUsage.requestCount === 1 ? 'request' : 'requests'}
            </span>
          </div>
          <span className="text-gray-400 dark:text-gray-500 text-[10px]">
            {expanded ? '▼' : '▶'} {expanded ? 'Hide' : 'Show'} details
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 text-xs font-mono space-y-1 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex justify-between">
            <span>Input tokens:</span>
            <span>{formatTokens(sessionUsage.inputTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span>Output tokens:</span>
            <span>{formatTokens(sessionUsage.outputTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total duration:</span>
            <span>{formatDuration(sessionUsage.durationMs)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-800 font-semibold">
            <span>Total cost:</span>
            <span>{formatCost(sessionUsage.totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
