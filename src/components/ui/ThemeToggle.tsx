'use client';

import { useAppTheme } from '@/hooks/useAppTheme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('ThemeToggle');

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, mounted } = useAppTheme();

  // Avoid hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 h-9 w-24 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  const cycleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    log.debug('Theme toggled', { from: theme, to: newTheme });

    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Show current icon based on theme setting
  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-5 w-5" />;
    }
    if (resolvedTheme === 'dark') {
      return <Moon className="h-5 w-5" />;
    }
    return <Sun className="h-5 w-5" />;
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'dark') return 'Dark';
    return 'Light';
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] active:bg-gray-200 dark:active:bg-gray-700 transition-all duration-150"
      aria-label={`Current theme: ${getLabel()}. Click to cycle themes.`}
      title={`Theme: ${getLabel()}`}
    >
      {getIcon()}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {getLabel()}
      </span>
    </button>
  );
}
