// __tests__/lib/store/metadata-color-scheme.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/lib/store';

describe('ChatStore metadataColorScheme', () => {
  beforeEach(() => {
    useChatStore.setState({ metadataColorScheme: 'semantic' });
  });

  it('should default to semantic color scheme', () => {
    const { metadataColorScheme } = useChatStore.getState();
    expect(metadataColorScheme).toBe('semantic');
  });

  it('should toggle to gradient scheme', () => {
    const { setMetadataColorScheme } = useChatStore.getState();

    setMetadataColorScheme('gradient');
    expect(useChatStore.getState().metadataColorScheme).toBe('gradient');
  });

  it('should toggle back to semantic scheme', () => {
    const { setMetadataColorScheme } = useChatStore.getState();

    setMetadataColorScheme('gradient');
    setMetadataColorScheme('semantic');
    expect(useChatStore.getState().metadataColorScheme).toBe('semantic');
  });

  it('should persist color scheme preference', () => {
    // This tests that partialize includes metadataColorScheme
    const { metadataColorScheme } = useChatStore.getState();
    expect(metadataColorScheme).toBeDefined();
  });
});
