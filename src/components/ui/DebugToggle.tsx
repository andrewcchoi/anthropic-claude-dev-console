'use client';

import { useDebug } from '@/components/providers/DebugProvider';
import { enableDebug, disableDebug } from '@/lib/debug';
import { Bug, ExternalLink } from 'lucide-react';
import { showToast } from '@/lib/utils/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('DebugToggle');

interface DebugToggleProps {
  variant?: 'full' | 'compact';  // full = icon+label, compact = icon only
  openLogs?: boolean;            // if true, clicking opens /logs in new tab
  className?: string;
}

export function DebugToggle({ variant = 'full', openLogs = false, className = '' }: DebugToggleProps) {
  const { debugEnabled } = useDebug();

  const handleClick = async () => {
    try {
      if (openLogs) {
        // Always enable debug if not already enabled
        if (!debugEnabled) {
          await enableDebug();
          showToast('Debug mode enabled', 'success');
          log.info('Debug mode enabled via toggle');
        } else {
          // Already enabled, show feedback that we're opening logs
          showToast('Opening debug logs...', 'success');
          log.info('Debug already enabled, opening logs');
        }

        // Open logs in new tab
        window.open('/logs', '_blank');
        log.info('Opening logs in new tab');
      } else {
        // Toggle debug mode
        if (debugEnabled) {
          await disableDebug();
          showToast('Debug mode disabled', 'info');
          log.info('Debug mode disabled via toggle');
        } else {
          await enableDebug();
          showToast('Debug mode enabled', 'success');
          log.info('Debug mode enabled via toggle');
        }
      }
    } catch (error) {
      log.error('Failed to toggle debug mode', { error });
      showToast('Failed to toggle debug mode', 'error');
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        aria-label={debugEnabled ? 'Debug mode on' : 'Debug mode off'}
        title={debugEnabled ? 'Debug mode on' : 'Debug mode off'}
        className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
          debugEnabled
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-500 dark:text-gray-500'
        } ${className}`}
      >
        <Bug className="h-5 w-5" />
      </button>
    );
  }

  // Full variant (icon + label)
  // When openLogs is true and custom className provided, apply different background when debug is enabled
  const getButtonClasses = () => {
    if (openLogs && className) {
      // For RightPanel style buttons with openLogs, add visual state based on debugEnabled
      const baseClasses = className;
      const activeState = 'active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-600';
      const debugRing = debugEnabled ? 'ring-2 ring-green-500/20 dark:ring-green-400/20' : '';
      return `${baseClasses} ${activeState} ${debugRing}`;
    }
    // Default styling
    return className || 'hover:bg-gray-100 dark:hover:bg-gray-800';
  };

  return (
    <button
      onClick={handleClick}
      aria-label={debugEnabled ? 'Debug mode on' : 'Debug mode off'}
      title={debugEnabled ? 'Debug mode on' : 'Debug mode off'}
      className={`flex items-center ${openLogs ? 'justify-between' : 'gap-2'} px-3 py-2 rounded-lg transition-all duration-150 ${getButtonClasses()}`}
    >
      <div className="flex items-center gap-2">
        <Bug
          className={`h-5 w-5 ${
            debugEnabled
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-500'
          }`}
        />
        <span
          className={`text-sm font-medium ${
            debugEnabled
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {debugEnabled ? 'Debug On' : 'Debug'}
        </span>
      </div>
      {openLogs && <ExternalLink className="h-4 w-4 text-gray-500" />}
    </button>
  );
}
