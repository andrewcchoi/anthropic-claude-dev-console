/**
 * TailscaleInstallPrompt Component
 * CTA to install Tailscale with platform-specific links
 */

'use client';

import { Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TailscaleInstallPromptProps {
  className?: string;
  compact?: boolean;
}

export function TailscaleInstallPrompt({ className, compact = false }: TailscaleInstallPromptProps) {
  const installUrl = 'https://tailscale.com/download';

  if (compact) {
    return (
      <div className={cn('text-sm text-gray-600 dark:text-gray-400', className)}>
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <Download className="w-3.5 h-3.5" />
          Install Tailscale
          <ExternalLink className="w-3 h-3" />
        </a>
        {' '}to enable auto-discovery
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Tailscale Not Installed
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Install Tailscale to automatically discover devices on your private network.
            No port forwarding or firewall configuration required.
          </p>
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download Tailscale
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
