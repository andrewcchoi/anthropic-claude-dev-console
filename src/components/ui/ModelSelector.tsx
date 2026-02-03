'use client';

import { useChatStore } from '@/lib/store';
import { ChevronDown, Cpu } from 'lucide-react';

const AVAILABLE_MODELS = [
  { value: '', label: 'Default', description: 'Use CLI default model' },
  { value: 'haiku', label: 'Haiku', description: 'Fast, economical' },
  { value: 'sonnet', label: 'Sonnet', description: 'Balanced performance' },
  { value: 'opus', label: 'Opus', description: 'Most capable' },
];

export function ModelSelector() {
  const { preferredModel, setPreferredModel, currentModel, isStreaming } = useChatStore();

  return (
    <div className="px-3 py-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
        <Cpu className="h-3.5 w-3.5" />
        Model
      </label>
      <div className="relative">
        <select
          value={preferredModel || ''}
          onChange={(e) => setPreferredModel(e.target.value || null)}
          disabled={isStreaming}
          className="w-full px-3 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 appearance-none cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      {currentModel && (
        <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Active: <span className="font-mono">{currentModel}</span>
        </div>
      )}
    </div>
  );
}
