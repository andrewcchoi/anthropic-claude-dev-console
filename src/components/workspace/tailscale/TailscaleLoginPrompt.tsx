/**
 * TailscaleLoginPrompt Component
 * CTA to log in to Tailscale
 */

'use client';

import { LogIn, Terminal, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TailscaleLoginPromptProps {
  className?: string;
  compact?: boolean;
}

export function TailscaleLoginPrompt({ className, compact = false }: TailscaleLoginPromptProps) {
  const loginUrl = 'https://login.tailscale.com/admin';

  if (compact) {
    return (
      <div className={cn('text-sm text-gray-600 dark:text-gray-400', className)}>
        Run{' '}
        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
          tailscale login
        </code>
        {' '}to connect to your Tailnet
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <LogIn className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Tailscale Not Connected
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Log in to Tailscale to discover your devices. Run the following command:
          </p>
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-900 rounded-lg">
            <Terminal className="w-4 h-4 text-gray-400" />
            <code className="text-sm text-green-400 font-mono">
              tailscale login
            </code>
          </div>
          <a
            href={loginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Open Tailscale Admin Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
