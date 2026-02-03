'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Shared hook for accessing resolved theme state.
 * Returns 'light' or 'dark' after hydration, undefined before.
 */
export function useAppTheme() {
  const { theme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return undefined until mounted to avoid hydration mismatch
  const resolvedTheme = mounted
    ? (theme === 'system' ? systemTheme : theme)
    : undefined;

  return {
    resolvedTheme,
    theme: mounted ? theme : undefined,  // Return undefined until mounted
    setTheme,
    mounted
  };
}
