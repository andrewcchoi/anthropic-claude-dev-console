/**
 * TailscaleStatusBadge Component
 * Shows connection status for Tailscale
 */

'use client';

import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type TailscaleConnectionStatus = 'connected' | 'disconnected' | 'not-installed' | 'loading' | 'error';

interface TailscaleStatusBadgeProps {
  status: TailscaleConnectionStatus;
  tailnetName?: string;
  className?: string;
}

const statusConfig: Record<TailscaleConnectionStatus, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  connected: {
    icon: <Wifi className="w-3.5 h-3.5" />,
    label: 'Connected',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  disconnected: {
    icon: <WifiOff className="w-3.5 h-3.5" />,
    label: 'Disconnected',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  'not-installed': {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: 'Not Installed',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
  loading: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: 'Checking...',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: 'Error',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
};

export function TailscaleStatusBadge({ status, tailnetName, className }: TailscaleStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
      role="status"
      aria-label={`Tailscale status: ${config.label}${tailnetName ? ` on ${tailnetName}` : ''}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {tailnetName && status === 'connected' && (
        <span className="opacity-70">· {tailnetName}</span>
      )}
    </div>
  );
}
