/**
 * Test Utilities
 *
 * Provides common test helpers and wrapper components for testing
 * with proper context providers.
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { DebugProvider } from '@/components/providers/DebugProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

/**
 * All Providers wrapper for testing
 * Includes: ThemeProvider, DebugProvider
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DebugProvider>
        {children}
      </DebugProvider>
    </ThemeProvider>
  );
}

/**
 * Custom render function that wraps components in all required providers
 */
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render with our custom version
export { customRender as render };
