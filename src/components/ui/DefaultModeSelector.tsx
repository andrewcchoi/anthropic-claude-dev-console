'use client';

import { useChatStore } from '@/lib/store';
import { ChevronDown, Shield } from 'lucide-react';
import { DefaultMode } from '@/types/claude';

const DEFAULT_MODES: { value: DefaultMode; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Standard permission checks' },
  { value: 'acceptEdits', label: 'Accept Edits', description: 'Auto-accept file edits' },
  { value: 'plan', label: 'Plan', description: 'Planning mode' },
  { value: 'dontAsk', label: "Don't Ask", description: 'Skip confirmations' },
  { value: 'bypassPermissions', label: 'Bypass', description: 'Bypass all checks' },
];

export function DefaultModeSelector() {
  const { defaultMode, setDefaultMode, isStreaming } = useChatStore();

  return (
    <div className="px-3 py-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
        <Shield className="h-3.5 w-3.5" />
        Permission Mode
      </label>
      <div className="relative">
        <select
          value={defaultMode}
          onChange={(e) => setDefaultMode(e.target.value as DefaultMode)}
          disabled={isStreaming}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 dark:focus:ring-offset-gray-900 transition-all"
        >
          {DEFAULT_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        {DEFAULT_MODES.find((m) => m.value === defaultMode)?.description}
      </div>
    </div>
  );
}
