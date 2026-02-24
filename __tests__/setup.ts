/**
 * Vitest Setup File
 *
 * This file runs before each test file and sets up the testing environment.
 * Specifically, it extends Vitest's expect with jest-dom matchers.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock global fetch for API calls
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

Object.defineProperty(global, 'fetch', {
  writable: true,
  value: mockFetch,
});

// Reset fetch mock before each test
beforeEach(() => {
  mockFetch.mockClear();
});

// Mock window.matchMedia for components that use it (e.g., theme detection)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver for components that need it
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock IntersectionObserver for lazy loading components
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Suppress console errors during tests (optional - comment out for debugging)
// vi.spyOn(console, 'error').mockImplementation(() => {});
