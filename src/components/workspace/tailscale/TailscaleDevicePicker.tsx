/**
 * TailscaleDevicePicker Component
 * Device selection for SSH workspace with Tailscale
 */

'use client';

import { useState, useCallback, useId } from 'react';
import useSWR from 'swr';
import { RefreshCw, Check, Circle, Wifi, WifiOff, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { OSIcon } from './OSIcon';
import { DevicePickerSkeleton } from './DevicePickerSkeleton';
import { TailscaleInstallPrompt } from './TailscaleInstallPrompt';
import { TailscaleLoginPrompt } from './TailscaleLoginPrompt';
import { TailscaleStatusBadge } from './TailscaleStatusBadge';
import { createLogger } from '@/lib/logger';
import type { TailscaleStatus, TailscaleDevice } from '@/lib/workspace/tailscale/types';

const log = createLogger('TailscaleDevicePicker');

interface TailscaleDevicePickerProps {
  onSelect: (device: TailscaleDevice) => void;
  selectedDeviceId?: string;
  className?: string;
}

// Fetcher for SWR
const fetcher = async (url: string): Promise<TailscaleStatus> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Format last seen time relative to now
 */
function formatLastSeen(lastSeen: Date | string): string {
  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Device list item component
 */
function DeviceItem({
  device,
  isSelected,
  onSelect,
}: {
  device: TailscaleDevice;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const itemId = useId();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
        isSelected && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-500',
        !device.online && 'opacity-60'
      )}
      aria-selected={isSelected}
      aria-describedby={`${itemId}-description`}
      role="option"
    >
      {/* OS Icon */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        <OSIcon os={device.os} className="w-6 h-6" />
      </div>

      {/* Device Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {device.hostname}
          </span>
          {device.isSelf && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
              This device
            </span>
          )}
        </div>
        <div
          id={`${itemId}-description`}
          className="text-xs text-gray-500 dark:text-gray-400 truncate"
        >
          {device.dnsName || device.tailscaleIP}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* SSH Enabled Badge */}
        {device.sshEnabled && (
          <span
            className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"
            title="Tailscale SSH enabled"
          >
            SSH
          </span>
        )}

        {/* Online Status */}
        <div
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            device.online ? 'bg-green-500' : 'bg-gray-400'
          )}
          title={device.online ? 'Online' : `Last seen: ${formatLastSeen(device.lastSeen)}`}
        />

        {/* Selection Checkmark */}
        {isSelected && (
          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}

export function TailscaleDevicePicker({
  onSelect,
  selectedDeviceId,
  className,
}: TailscaleDevicePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchId = useId();
  const listId = useId();

  // Fetch status with SWR (auto-revalidation, caching)
  const { data: status, error, isLoading, mutate } = useSWR<TailscaleStatus>(
    '/api/workspace/tailscale/status',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  const handleRefresh = useCallback(() => {
    log.debug('Refreshing Tailscale status');
    mutate();
  }, [mutate]);

  const handleSelectDevice = useCallback(
    (device: TailscaleDevice) => {
      log.info('Device selected', { deviceId: device.id, hostname: device.hostname });
      onSelect(device);
    },
    [onSelect]
  );

  // Loading state
  if (isLoading) {
    return <DevicePickerSkeleton count={3} className={className} />;
  }

  // Error state
  if (error) {
    log.error('Failed to fetch Tailscale status', { error });
    return (
      <div
        className={cn(
          'p-4 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Failed to load Tailscale status
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {error.message || 'An error occurred'}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not installed state
  if (!status?.installed) {
    return <TailscaleInstallPrompt className={className} />;
  }

  // Not logged in state
  if (!status.loggedIn) {
    return <TailscaleLoginPrompt className={className} />;
  }

  // Filter devices (exclude self, apply search)
  const devices = (status.devices || [])
    .filter((d) => !d.isSelf) // Don't show current device
    .filter((d) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        d.hostname.toLowerCase().includes(query) ||
        d.dnsName.toLowerCase().includes(query) ||
        d.tailscaleIP.includes(query) ||
        d.os.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Online devices first, then by hostname
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.hostname.localeCompare(b.hostname);
    });

  // Get status for badge
  const connectionStatus = status.connected ? 'connected' : 'disconnected';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with status and refresh */}
      <div className="flex items-center justify-between">
        <TailscaleStatusBadge
          status={connectionStatus}
          tailnetName={status.tailnetName}
        />
        <button
          type="button"
          onClick={handleRefresh}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Refresh device list"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search input */}
      {devices.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id={searchId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search devices..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            aria-label="Search devices"
          />
        </div>
      )}

      {/* Device list */}
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden max-h-64 overflow-y-auto"
        role="listbox"
        aria-label="Available devices"
        id={listId}
      >
        {devices.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? (
              <>No devices matching &quot;{searchQuery}&quot;</>
            ) : (
              <>No other devices found on your Tailnet</>
            )}
          </div>
        ) : (
          devices.map((device) => (
            <DeviceItem
              key={device.id}
              device={device}
              isSelected={device.id === selectedDeviceId}
              onSelect={() => handleSelectDevice(device)}
            />
          ))
        )}
      </div>

      {/* Device count */}
      {devices.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {devices.filter((d) => d.online).length} online · {devices.length} total devices
        </p>
      )}
    </div>
  );
}
