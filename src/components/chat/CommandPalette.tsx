'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, Zap, Package } from 'lucide-react';
import { LOCAL_COMMAND_INFO, CommandInfo } from '@/lib/commands/router';
import { useChatStore } from '@/lib/store';

interface CommandPaletteProps {
  inputValue: string;
  onSelectCommand: (command: string) => void;
  onClose: () => void;
}

export function CommandPalette({ inputValue, onSelectCommand, onClose }: CommandPaletteProps) {
  const { availableSkills, availableCommands } = useChatStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Extract search query (everything after /)
  const searchQuery = inputValue.slice(1).toLowerCase();

  // Combine all available commands
  const allCommands: Array<CommandInfo & { type: 'local' | 'skill' | 'command' }> = [
    ...LOCAL_COMMAND_INFO.map(cmd => ({ ...cmd, type: 'local' as const })),
    ...(availableSkills || []).map((skill: string) => ({
      command: `/${skill}`,
      handler: 'skill',
      description: 'Skill command',
      type: 'skill' as const,
    })),
    ...(availableCommands || []).map((cmd: string) => ({
      command: `/${cmd}`,
      handler: 'passthrough',
      description: 'CLI command',
      type: 'command' as const,
    })),
  ];

  // Filter commands based on search query
  const filteredCommands = searchQuery
    ? allCommands.filter(cmd =>
        cmd.command.toLowerCase().includes(searchQuery)
      )
    : allCommands;

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex].command);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelectCommand, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement;
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No commands found matching &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'skill':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'command':
        return <Package className="h-4 w-4 text-purple-500" />;
      default:
        return <Terminal className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
      <div className="max-h-64 overflow-y-auto" ref={listRef}>
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.command}
            onClick={() => onSelectCommand(cmd.command)}
            className={`w-full flex items-start gap-3 px-4 py-2 text-left transition-colors ${
              index === selectedIndex
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(cmd.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {cmd.command}
                </code>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {cmd.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {cmd.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">↑↓</kbd> Navigate
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Enter</kbd> Select
          <span className="mx-2">•</span>
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Esc</kbd> Close
        </p>
      </div>
    </div>
  );
}
