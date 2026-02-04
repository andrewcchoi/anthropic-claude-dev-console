'use client';

import { useChatStore } from '@/lib/store';
import { X } from 'lucide-react';
import { ModelSelector } from '@/components/ui/ModelSelector';

export function ModelPanel() {
  const { isModelPanelOpen, setModelPanelOpen } = useChatStore();

  if (!isModelPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Select Model
          </h2>
          <button
            onClick={() => setModelPanelOpen(false)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <ModelSelector />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            The selected model will be used for new conversations. Current conversations will continue with their existing model.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={() => setModelPanelOpen(false)}
            className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
