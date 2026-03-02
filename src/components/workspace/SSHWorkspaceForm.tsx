/**
 * SSHWorkspaceForm Component
 * Form for configuring SSH workspace connections with Tailscale support
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Server, Key, Lock, FolderOpen, ToggleLeft, ToggleRight, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TailscaleDevicePicker } from './tailscale';
import { createLogger } from '@/lib/logger';
import type { TailscaleDevice } from '@/lib/workspace/tailscale/types';
import type { SSHProviderConfig } from '@/lib/workspace/types';

const log = createLogger('SSHWorkspaceForm');

interface SSHWorkspaceFormProps {
  onSubmit: (config: SSHProviderConfig) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface FormState {
  useTailscale: boolean;
  tailscaleDevice: TailscaleDevice | null;
  hostname: string;
  port: number;
  username: string;
  remotePath: string;
  authMethod: 'key' | 'password';
  keyPath: string;
  useMagicDNS: boolean;
  requireDirect: boolean;
}

const DEFAULT_FORM_STATE: FormState = {
  useTailscale: true, // Default to Tailscale when available
  tailscaleDevice: null,
  hostname: '',
  port: 22,
  username: '',
  remotePath: '/home',
  authMethod: 'key',
  keyPath: '~/.ssh/id_rsa',
  useMagicDNS: false,
  requireDirect: false,
};

/**
 * Form field wrapper component
 */
function FormField({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}

export function SSHWorkspaceForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SSHWorkspaceFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Validation
  const canSubmit = useMemo(() => {
    // Must have username and remote path
    if (!form.username.trim()) return false;
    if (!form.remotePath.trim()) return false;

    // If using Tailscale, must have device selected
    if (form.useTailscale) {
      if (!form.tailscaleDevice) return false;
    } else {
      // If manual, must have hostname
      if (!form.hostname.trim()) return false;
    }

    // If using key auth, must have key path
    if (form.authMethod === 'key' && !form.keyPath.trim()) return false;

    return true;
  }, [form]);

  const handleTailscaleSelect = useCallback((device: TailscaleDevice) => {
    log.info('Tailscale device selected', { deviceId: device.id, hostname: device.hostname });
    setForm((prev) => ({
      ...prev,
      tailscaleDevice: device,
      // Pre-fill hostname from device
      hostname: device.hostname,
      // Pre-fill username if we can detect from user field
      username: prev.username || (device.user?.split('@')[0] || ''),
      // Suggest home directory based on OS
      remotePath:
        prev.remotePath === '/home'
          ? device.os.toLowerCase().includes('darwin')
            ? '/Users'
            : '/home'
          : prev.remotePath,
    }));
    // Clear hostname error since we have a device now
    setErrors((prev) => ({ ...prev, hostname: undefined }));
  }, []);

  const handleToggleTailscale = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      useTailscale: !prev.useTailscale,
      // Clear Tailscale device if switching to manual
      tailscaleDevice: !prev.useTailscale ? null : prev.tailscaleDevice,
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate
      const newErrors: Partial<Record<keyof FormState, string>> = {};

      if (!form.username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!form.remotePath.trim()) {
        newErrors.remotePath = 'Remote path is required';
      }

      if (form.useTailscale) {
        if (!form.tailscaleDevice) {
          newErrors.tailscaleDevice = 'Please select a device';
        }
      } else {
        if (!form.hostname.trim()) {
          newErrors.hostname = 'Hostname is required';
        }
      }

      if (form.authMethod === 'key' && !form.keyPath.trim()) {
        newErrors.keyPath = 'Key path is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Build config
      const config: SSHProviderConfig = {
        type: 'ssh',
        host: form.useTailscale && form.tailscaleDevice
          ? (form.useMagicDNS ? form.tailscaleDevice.dnsName : form.tailscaleDevice.tailscaleIP)
          : form.hostname.trim(),
        port: form.port,
        username: form.username.trim(),
        remotePath: form.remotePath.trim(),
        authMethod: form.authMethod,
        ...(form.authMethod === 'key' && { keyPath: form.keyPath.trim() }),
        ...(form.useTailscale && form.tailscaleDevice && {
          tailscale: {
            enabled: true,
            deviceId: form.tailscaleDevice.id,
            useMagicDNS: form.useMagicDNS,
            requireDirect: form.requireDirect,
          },
        }),
      };

      log.info('Submitting SSH config', { useTailscale: form.useTailscale, host: config.host });
      onSubmit(config);
    },
    [form, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel]
  );

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      {/* Tailscale Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Use Tailscale
          </span>
          <div
            className="group relative"
            title="Automatically discover and connect to devices on your Tailscale network"
          >
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleTailscale}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
            form.useTailscale ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          )}
          role="switch"
          aria-checked={form.useTailscale}
          aria-label="Use Tailscale for connection"
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
              form.useTailscale && 'translate-x-5'
            )}
          />
        </button>
      </div>

      {/* Tailscale Device Picker */}
      {form.useTailscale && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Device <span className="text-red-500">*</span>
          </label>
          <TailscaleDevicePicker
            onSelect={handleTailscaleSelect}
            selectedDeviceId={form.tailscaleDevice?.id}
          />
          {errors.tailscaleDevice && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tailscaleDevice}</p>
          )}

          {/* Tailscale Options */}
          {form.tailscaleDevice && (
            <div className="mt-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.useMagicDNS}
                  onChange={(e) => setForm((prev) => ({ ...prev, useMagicDNS: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Use Magic DNS name instead of IP
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requireDirect}
                  onChange={(e) => setForm((prev) => ({ ...prev, requireDirect: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require direct connection (fail if relay needed)
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Manual Host Configuration */}
      {!form.useTailscale && (
        <div className="space-y-3">
          <FormField label="Hostname / IP" required hint="e.g., 192.168.1.100 or my-server.local">
            <input
              type="text"
              value={form.hostname}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, hostname: e.target.value }));
                setErrors((prev) => ({ ...prev, hostname: undefined }));
              }}
              placeholder="192.168.1.100"
              className={cn(
                'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.hostname
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}
            />
            {errors.hostname && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.hostname}</p>
            )}
          </FormField>

          <FormField label="Port" hint="Default: 22">
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm((prev) => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
              min={1}
              max={65535}
              className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>
      )}

      {/* SSH Configuration (always shown) */}
      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          SSH Configuration
        </h3>

        <FormField label="Username" required hint="Your SSH username on the remote machine">
          <input
            type="text"
            value={form.username}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, username: e.target.value }));
              setErrors((prev) => ({ ...prev, username: undefined }));
            }}
            placeholder="pi"
            className={cn(
              'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.username
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600'
            )}
          />
          {errors.username && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username}</p>
          )}
        </FormField>

        <FormField label="Remote Path" required hint="Directory to open as workspace">
          <div className="flex gap-2">
            <FolderOpen className="w-5 h-5 mt-2 text-gray-400" />
            <input
              type="text"
              value={form.remotePath}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, remotePath: e.target.value }));
                setErrors((prev) => ({ ...prev, remotePath: undefined }));
              }}
              placeholder="/home/user/projects"
              className={cn(
                'flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.remotePath
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}
            />
          </div>
          {errors.remotePath && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.remotePath}</p>
          )}
        </FormField>

        {/* Auth Method */}
        <FormField label="Authentication Method">
          <div className="flex gap-3">
            <label
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                form.authMethod === 'key'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <input
                type="radio"
                name="authMethod"
                value="key"
                checked={form.authMethod === 'key'}
                onChange={() => setForm((prev) => ({ ...prev, authMethod: 'key' }))}
                className="sr-only"
              />
              <Key className="w-4 h-4" />
              <span className="text-sm">SSH Key</span>
            </label>
            <label
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                form.authMethod === 'password'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <input
                type="radio"
                name="authMethod"
                value="password"
                checked={form.authMethod === 'password'}
                onChange={() => setForm((prev) => ({ ...prev, authMethod: 'password' }))}
                className="sr-only"
              />
              <Lock className="w-4 h-4" />
              <span className="text-sm">Password</span>
            </label>
          </div>
        </FormField>

        {/* Key Path (if key auth) */}
        {form.authMethod === 'key' && (
          <FormField label="SSH Key Path" hint="Path to your private key">
            <input
              type="text"
              value={form.keyPath}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, keyPath: e.target.value }));
                setErrors((prev) => ({ ...prev, keyPath: undefined }));
              }}
              placeholder="~/.ssh/id_rsa"
              className={cn(
                'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm',
                errors.keyPath
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}
            />
            {errors.keyPath && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.keyPath}</p>
            )}
          </FormField>
        )}

        {/* Password warning */}
        {form.authMethod === 'password' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              You&apos;ll be prompted for your password each time you connect.
              Consider using SSH keys for easier, more secure access.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {isSubmitting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </form>
  );
}
