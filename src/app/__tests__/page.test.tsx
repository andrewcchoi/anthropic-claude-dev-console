import { describe, it, expect } from 'vitest';

// Verify SessionPanel has useRef guard for discovery
describe('SessionPanel - Discovery Guard', () => {
  it('has useRef guard to prevent Strict Mode double-invoke', async () => {
    // Read SessionPanel source file
    const fs = await import('fs/promises');
    const source = await fs.readFile('src/components/sidebar/SessionPanel.tsx', 'utf-8');

    // Verify useRef is imported
    expect(source).toContain("useRef");

    // Verify hasDiscovered guard exists
    expect(source).toContain('hasDiscovered');

    // Verify guard check before discovery
    expect(source).toMatch(/if.*hasDiscovered.*current/);
    expect(source).toContain('Discovery already initiated, skipping');
  });
});
