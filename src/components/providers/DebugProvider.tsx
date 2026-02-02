'use client';

/**
 * Debug Provider
 * React context for debug mode state
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isDebugEnabled, onDebugModeChange, installDebugCommands } from '@/lib/debug';

interface DebugContextValue {
  debugEnabled: boolean;
}

const DebugContext = createContext<DebugContextValue | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    // Initialize debug state from localStorage
    setDebugEnabled(isDebugEnabled());

    // Install global debug commands
    installDebugCommands();

    // Listen for debug mode changes
    const cleanup = onDebugModeChange((enabled) => {
      setDebugEnabled(enabled);
    });

    return cleanup;
  }, []);

  return (
    <DebugContext.Provider value={{ debugEnabled }}>
      {children}
    </DebugContext.Provider>
  );
}

/**
 * Hook to access debug mode state
 *
 * @example
 * const { debugEnabled } = useDebug();
 * if (debugEnabled) {
 *   // Show extra debug info
 * }
 */
export function useDebug(): DebugContextValue {
  const context = useContext(DebugContext);

  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }

  return context;
}
