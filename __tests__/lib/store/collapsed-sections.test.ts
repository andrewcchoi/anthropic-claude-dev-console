// __tests__/lib/store/collapsed-sections.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/lib/store';

describe('ChatStore collapsedSections', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({ collapsedSections: new Set() });
  });

  it('should initialize collapsedSections as empty Set', () => {
    const { collapsedSections } = useChatStore.getState();
    expect(collapsedSections).toBeInstanceOf(Set);
    expect(collapsedSections.size).toBe(0);
  });

  it('should toggle section collapse', () => {
    const { toggleSectionCollapse, collapsedSections: initial } = useChatStore.getState();
    expect(initial.has('system')).toBe(false);

    // Collapse section
    toggleSectionCollapse('system');
    expect(useChatStore.getState().collapsedSections.has('system')).toBe(true);

    // Expand section (toggle again)
    toggleSectionCollapse('system');
    expect(useChatStore.getState().collapsedSections.has('system')).toBe(false);
  });

  it('should handle multiple sections independently', () => {
    const { toggleSectionCollapse } = useChatStore.getState();

    toggleSectionCollapse('system');
    toggleSectionCollapse('unassigned');
    toggleSectionCollapse('home-workspace-1');

    const { collapsedSections } = useChatStore.getState();
    expect(collapsedSections.size).toBe(3);
    expect(collapsedSections.has('system')).toBe(true);
    expect(collapsedSections.has('unassigned')).toBe(true);
    expect(collapsedSections.has('home-workspace-1')).toBe(true);
  });
});
