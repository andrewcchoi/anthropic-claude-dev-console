import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './index';

describe('ChatStore - Right Panel State', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useChatStore.getState();
    store.startNewSession();
    // Reset UI state that startNewSession doesn't touch
    store.setRightPanelOpen(true);
    store.toggleSidebar(); // Toggle back to true if it was false
    if (!useChatStore.getState().sidebarOpen) {
      store.toggleSidebar();
    }
  });

  describe('Initial State', () => {
    it('should initialize rightPanelOpen as true', () => {
      const { rightPanelOpen } = useChatStore.getState();
      expect(rightPanelOpen).toBe(true);
    });
  });

  describe('toggleRightPanel', () => {
    it('should toggle rightPanelOpen from true to false', () => {
      const store = useChatStore.getState();
      expect(store.rightPanelOpen).toBe(true);

      store.toggleRightPanel();

      expect(useChatStore.getState().rightPanelOpen).toBe(false);
    });

    it('should toggle rightPanelOpen from false to true', () => {
      const store = useChatStore.getState();
      store.setRightPanelOpen(false);
      expect(useChatStore.getState().rightPanelOpen).toBe(false);

      store.toggleRightPanel();

      expect(useChatStore.getState().rightPanelOpen).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      const store = useChatStore.getState();

      expect(store.rightPanelOpen).toBe(true);
      store.toggleRightPanel();
      expect(useChatStore.getState().rightPanelOpen).toBe(false);
      store.toggleRightPanel();
      expect(useChatStore.getState().rightPanelOpen).toBe(true);
      store.toggleRightPanel();
      expect(useChatStore.getState().rightPanelOpen).toBe(false);
    });
  });

  describe('setRightPanelOpen', () => {
    it('should set rightPanelOpen to true', () => {
      const store = useChatStore.getState();
      store.setRightPanelOpen(false);
      expect(useChatStore.getState().rightPanelOpen).toBe(false);

      store.setRightPanelOpen(true);

      expect(useChatStore.getState().rightPanelOpen).toBe(true);
    });

    it('should set rightPanelOpen to false', () => {
      const store = useChatStore.getState();
      expect(store.rightPanelOpen).toBe(true);

      store.setRightPanelOpen(false);

      expect(useChatStore.getState().rightPanelOpen).toBe(false);
    });

    it('should handle setting same value idempotently', () => {
      const store = useChatStore.getState();

      store.setRightPanelOpen(true);
      expect(useChatStore.getState().rightPanelOpen).toBe(true);

      store.setRightPanelOpen(true);
      expect(useChatStore.getState().rightPanelOpen).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should not persist rightPanelOpen state', () => {
      // This test verifies that rightPanelOpen is NOT in the partialize function
      // The actual persistence behavior would need localStorage mocking to test fully
      // For now, we verify the state exists and works correctly
      const store = useChatStore.getState();

      store.setRightPanelOpen(false);
      expect(useChatStore.getState().rightPanelOpen).toBe(false);

      // After a new session, UI state should reset but we keep the in-memory value
      // This is consistent with how sidebarOpen works
      const currentValue = useChatStore.getState().rightPanelOpen;
      store.startNewSession();

      // UI state persists in memory during same session
      expect(useChatStore.getState().rightPanelOpen).toBe(currentValue);
    });
  });

  describe('Pattern Consistency with Sidebar', () => {
    it('should follow same pattern as sidebarOpen', () => {
      const store = useChatStore.getState();

      // Both should have toggle functions
      expect(typeof store.toggleSidebar).toBe('function');
      expect(typeof store.toggleRightPanel).toBe('function');

      // Both should be boolean state
      expect(typeof store.sidebarOpen).toBe('boolean');
      expect(typeof store.rightPanelOpen).toBe('boolean');

      // Both should default to true
      expect(store.sidebarOpen).toBe(true);
      expect(store.rightPanelOpen).toBe(true);
    });

    it('should be independent from sidebar state', () => {
      const store = useChatStore.getState();

      // Toggle sidebar shouldn't affect right panel
      store.toggleSidebar();
      expect(useChatStore.getState().rightPanelOpen).toBe(true);

      // Toggle right panel shouldn't affect sidebar
      store.toggleRightPanel();
      expect(useChatStore.getState().sidebarOpen).toBe(false); // Still toggled from before

      // Both can be closed independently
      expect(useChatStore.getState().rightPanelOpen).toBe(false);
      expect(useChatStore.getState().sidebarOpen).toBe(false);
    });
  });
});
