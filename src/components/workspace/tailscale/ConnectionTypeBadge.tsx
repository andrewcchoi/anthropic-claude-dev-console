/**
 * ConnectionTypeBadge Component
 * Shows connection type (Direct/Relay) with latency
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, Radio, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { createLogger } from '@/lib/logger';
import type { TailscalePingResult } from '@/lib/workspace/tailscale/types';

const log = createLogger('ConnectionTypeBadge');

interface ConnectionTypeBadgeProps {
  deviceId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  compact?: boolean;
}

type ConnectionState = 'loading' | 'direct' | 'relay' | 'error' | 'unknown';

interface PingState {
  state: ConnectionState;
  latency?: number;
  error?: string;
}

export function ConnectionTypeBadge({
  deviceId,
  autoRefresh = false,
  refreshInterval = 30000,
  className,
  compact = false,
}: ConnectionTypeBadgeProps) {
  const [pingState, setPingState] = useState<PingState>({ state: 'unknown' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPing = useCallback(async () => {
    if (!deviceId) {
      setPingState({ state: 'unknown' });
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/workspace/tailscale/ping?deviceId=${encodeURIComponent(deviceId)}`);

      if (!response.ok) {
        throw new Error(`Ping failed: ${response.statusText}`);
      }

      const result: TailscalePingResult = await response.json();

      if (result.error) {
        log.warn('Ping returned error', { deviceId, error: result.error });
        setPingState({ state: 'error', error: result.error });
      } else {
        setPingState({
          state: result.via === 'direct' ? 'direct' : 'relay',
          latency: result.latency,
        });
      }
    } catch (error) {
      log.error('Failed to ping device', { deviceId, error });
      setPingState({
        state: 'error',
        error: error instanceof Error ? error.message : 'Ping failed',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [deviceId]);

  // Initial fetch
  useEffect(() => {
    if (deviceId) {
      setPingState({ state: 'loading' });
      fetchPing();
    }
  }, [deviceId, fetchPing]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !deviceId) return;

    const interval = setInterval(fetchPing, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, deviceId, fetchPing]);

  // Render based on state
  const renderBadge = () => {
    switch (pingState.state) {
      case 'loading':
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              className
            )}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            {!compact && <span>Checking...</span>}
          </div>
        );

      case 'direct':
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
              className
            )}
            title={`Direct connection${pingState.latency ? ` (${pingState.latency}ms)` : ''}`}
          >
            <Zap className="w-3 h-3" />
            {!compact && (
              <>
                <span>Direct</span>
                {pingState.latency !== undefined && (
                  <span className="opacity-70">{pingState.latency}ms</span>
                )}
              </>
            )}
          </div>
        );

      case 'relay':
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
              className
            )}
            title={`Relay connection via DERP${pingState.latency ? ` (${pingState.latency}ms)` : ''}`}
          >
            <Radio className="w-3 h-3" />
            {!compact && (
              <>
                <span>Relay</span>
                {pingState.latency !== undefined && (
                  <span className="opacity-70">{pingState.latency}ms</span>
                )}
              </>
            )}
          </div>
        );

      case 'error':
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
              className
            )}
            title={pingState.error || 'Connection check failed'}
          >
            <AlertCircle className="w-3 h-3" />
            {!compact && <span>Error</span>}
          </div>
        );

      case 'unknown':
      default:
        return (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              className
            )}
          >
            <Radio className="w-3 h-3" />
            {!compact && <span>Unknown</span>}
          </div>
        );
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      {renderBadge()}
      {!compact && pingState.state !== 'loading' && (
        <button
          type="button"
          onClick={fetchPing}
          disabled={isRefreshing}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          title="Refresh connection status"
          aria-label="Refresh connection status"
        >
          <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}
