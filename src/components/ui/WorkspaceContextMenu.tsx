'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Archive, RotateCcw, FolderPlus } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('WorkspaceContextMenu');

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface WorkspaceContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function WorkspaceContextMenu({ x, y, items, onClose }: WorkspaceContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    // Adjust position if menu would overflow viewport
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    if (adjustedX !== x || adjustedY !== y) {
      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors ${
            item.variant === 'danger'
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          } ${
            item.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// Pre-built menu configurations
export const WORKSPACE_CONTEXT_ITEMS = {
  newWorkspace: (onClick: () => void): ContextMenuItem => ({
    label: 'New Workspace',
    icon: <FolderPlus className="w-4 h-4" />,
    onClick,
  }),
  archive: (onClick: () => void, disabled = false): ContextMenuItem => ({
    label: 'Archive',
    icon: <Archive className="w-4 h-4" />,
    onClick,
    disabled,
  }),
  restore: (onClick: () => void): ContextMenuItem => ({
    label: 'Restore',
    icon: <RotateCcw className="w-4 h-4" />,
    onClick,
  }),
  delete: (onClick: () => void, disabled = false): ContextMenuItem => ({
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    onClick,
    variant: 'danger',
    disabled,
  }),
};
