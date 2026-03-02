/**
 * OSIcon Component
 * Display operating system icon for Tailscale devices
 */

'use client';

import { Monitor, Smartphone, Server, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface OSIconProps {
  os: string;
  className?: string;
  'aria-hidden'?: boolean;
}

/**
 * Get icon component for operating system
 */
function getIconComponent(os: string) {
  const normalizedOS = os.toLowerCase();

  if (normalizedOS.includes('linux')) {
    return LinuxIcon;
  }
  if (normalizedOS.includes('mac') || normalizedOS.includes('darwin')) {
    return AppleIcon;
  }
  if (normalizedOS.includes('windows')) {
    return WindowsIcon;
  }
  if (normalizedOS.includes('ios') || normalizedOS.includes('android')) {
    return Smartphone;
  }
  if (normalizedOS.includes('freebsd') || normalizedOS.includes('openbsd')) {
    return Server;
  }

  return HelpCircle;
}

/**
 * Linux penguin icon (simplified)
 */
function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C9.2 2 7 4.2 7 7c0 1.5.7 2.9 1.7 3.9-.9 1.2-1.7 2.6-1.7 4.1 0 2.8 2.2 5 5 5s5-2.2 5-5c0-1.5-.8-2.9-1.7-4.1 1-1 1.7-2.4 1.7-3.9 0-2.8-2.2-5-5-5zm0 2c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm-2 5.5c.5.3 1.3.5 2 .5s1.5-.2 2-.5c.8 1 1.5 2.2 1.5 3.5 0 1.9-1.6 3.5-3.5 3.5S8.5 14.9 8.5 13c0-1.3.7-2.5 1.5-3.5z" />
      <circle cx="10" cy="6" r="0.7" />
      <circle cx="14" cy="6" r="0.7" />
    </svg>
  );
}

/**
 * Apple icon (simplified)
 */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

/**
 * Windows icon (simplified)
 */
function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 5.5L10 4.5V11H3V5.5ZM3 12.5H10V19.5L3 18.5V12.5ZM11 4.3L21 3V11H11V4.3ZM11 12.5H21V21L11 19.7V12.5Z" />
    </svg>
  );
}

export function OSIcon({ os, className, 'aria-hidden': ariaHidden = true }: OSIconProps) {
  const IconComponent = getIconComponent(os);

  return (
    <div
      className={cn('text-gray-600 dark:text-gray-400', className)}
      aria-hidden={ariaHidden}
      title={os}
    >
      <IconComponent className="w-full h-full" />
    </div>
  );
}
