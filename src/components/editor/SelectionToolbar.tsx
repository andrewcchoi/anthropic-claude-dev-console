'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Copy, Search } from 'lucide-react';
import { ToolbarPosition, SelectionInfo } from '@/hooks/useEditorSelection';

interface SelectionToolbarProps {
  position: ToolbarPosition;
  selection: SelectionInfo;
  onInsert: (selection: SelectionInfo) => void;
  onCopy: (selection: SelectionInfo) => Promise<boolean>;
  onSearch: (selection: SelectionInfo) => void;
  onClose: () => void;
}

export function SelectionToolbar({
  position,
  selection,
  onInsert,
  onCopy,
  onSearch,
  onClose,
}: SelectionToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!toolbarRef.current) return;

    const toolbar = toolbarRef.current;
    const rect = toolbar.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position if toolbar would go off-screen
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    if (x < 10) {
      x = 10;
    }

    // Adjust vertical position if toolbar would go off-screen
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }
    if (y < 10) {
      y = 10;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate closure from the mouseup that triggered toolbar
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCopy = async () => {
    const success = await onCopy(selection);
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-1 p-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <button
        onClick={() => onInsert(selection)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="Insert reference to chat (Ctrl+Shift+I)"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Insert Reference
      </button>
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="Copy reference to clipboard (Ctrl+Shift+C)"
      >
        <Copy className="w-3.5 h-3.5" />
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
      <button
        onClick={() => onSearch(selection)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="Search codebase (Ctrl+Shift+S)"
      >
        <Search className="w-3.5 h-3.5" />
        Search
      </button>
    </div>
  );
}
