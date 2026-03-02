/**
 * DeviceDisambiguator Component
 * Helps users distinguish between devices with the same hostname
 */

'use client';

import { useMemo } from 'react';
import { AlertTriangle, Server, Wifi, WifiOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { OSIcon } from './OSIcon';
import { ConnectionTypeBadge } from './ConnectionTypeBadge';
import type { TailscaleDevice } from '@/lib/workspace/tailscale/types';

interface DeviceDisambiguatorProps {
  devices: TailscaleDevice[];
  selectedDeviceId?: string;
  onSelect: (device: TailscaleDevice) => void;
  className?: string;
}

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
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Get distinguishing characteristics for a device
 */
function getDeviceCharacteristics(device: TailscaleDevice, allDevices: TailscaleDevice[]): string[] {
  const characteristics: string[] = [];

  // OS is often unique
  const osCount = allDevices.filter((d) => d.os === device.os).length;
  if (osCount === 1) {
    characteristics.push(device.os);
  }

  // IP can help distinguish
  characteristics.push(device.tailscaleIP);

  // User might differ
  const userCount = allDevices.filter((d) => d.user === device.user).length;
  if (userCount < allDevices.length) {
    characteristics.push(`Owner: ${device.user.split('@')[0]}`);
  }

  // Tags can be helpful
  if (device.tags.length > 0) {
    characteristics.push(device.tags.join(', '));
  }

  return characteristics;
}

export function DeviceDisambiguator({
  devices,
  selectedDeviceId,
  onSelect,
  className,
}: DeviceDisambiguatorProps) {
  // Group devices by hostname
  const devicesByHostname = useMemo(() => {
    const groups = new Map<string, TailscaleDevice[]>();
    for (const device of devices) {
      const existing = groups.get(device.hostname) || [];
      groups.set(device.hostname, [...existing, device]);
    }
    return groups;
  }, [devices]);

  // Check if there are any collisions
  const hasCollisions = useMemo(() => {
    return Array.from(devicesByHostname.values()).some((group) => group.length > 1);
  }, [devicesByHostname]);

  if (devices.length === 0) {
    return (
      <div className={cn('text-center text-gray-500 dark:text-gray-400 py-4', className)}>
        No devices to display
      </div>
    );
  }

  // If no collisions, show simple list
  if (!hasCollisions) {
    return (
      <div className={cn('space-y-2', className)}>
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isSelected={device.id === selectedDeviceId}
            onSelect={() => onSelect(device)}
            showDetailedInfo={false}
          />
        ))}
      </div>
    );
  }

  // Show disambiguation UI for collisions
  return (
    <div className={cn('space-y-4', className)}>
      {/* Warning banner */}
      <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-200">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Multiple devices with same hostname</p>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
            Review the details below to select the correct device.
          </p>
        </div>
      </div>

      {/* Device groups */}
      {Array.from(devicesByHostname.entries()).map(([hostname, group]) => (
        <div key={hostname} className="space-y-2">
          {group.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Server className="w-4 h-4" />
              <span>
                {group.length} devices named &quot;{hostname}&quot;
              </span>
            </div>
          )}

          {group.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              isSelected={device.id === selectedDeviceId}
              onSelect={() => onSelect(device)}
              showDetailedInfo={group.length > 1}
              characteristics={
                group.length > 1 ? getDeviceCharacteristics(device, group) : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Individual device card component
 */
function DeviceCard({
  device,
  isSelected,
  onSelect,
  showDetailedInfo,
  characteristics,
}: {
  device: TailscaleDevice;
  isSelected: boolean;
  onSelect: () => void;
  showDetailedInfo: boolean;
  characteristics?: string[];
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-all',
        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700',
        !device.online && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* OS Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <OSIcon os={device.os} className="w-6 h-6" />
        </div>

        {/* Device Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {device.hostname}
            </span>

            {/* Status badges */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                device.online
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              {device.online ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {device.online ? 'Online' : 'Offline'}
            </span>

            {device.sshEnabled && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                SSH
              </span>
            )}
          </div>

          {/* DNS/IP */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {device.dnsName || device.tailscaleIP}
          </div>

          {/* Detailed info for disambiguation */}
          {showDetailedInfo && (
            <div className="mt-2 space-y-1">
              {/* Characteristics */}
              {characteristics && characteristics.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {characteristics.join(' · ')}
                </div>
              )}

              {/* Last seen */}
              {!device.online && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  Last seen: {formatLastSeen(device.lastSeen)}
                </div>
              )}

              {/* Connection type badge */}
              {device.online && (
                <ConnectionTypeBadge deviceId={device.id} compact />
              )}
            </div>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
