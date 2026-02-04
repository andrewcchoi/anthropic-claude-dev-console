'use client';

import { useToastStore } from '@/lib/utils/toast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-in slide-in-from-bottom-5 duration-300"
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            {toast.type === 'error' && (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {toast.type === 'info' && (
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          {/* Message */}
          <div className="flex-1 text-sm text-gray-900 dark:text-gray-100">
            {toast.message}
          </div>

          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
