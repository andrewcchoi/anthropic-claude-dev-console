import { createLogger } from '../logger';

const log = createLogger('StoreSync');

/**
 * Sync Coordinator
 *
 * Mediates bidirectional sync between workspace and chat stores
 * without creating circular imports. Stores subscribe to this coordinator
 * instead of importing each other directly.
 */

type SyncCallback = (event: SyncEvent) => void;

interface SyncEvent {
  type: 'session_created' | 'session_deleted' | 'workspace_deleted' | 'session_linked' | 'session_unlinked';
  payload: {
    sessionId?: string;
    workspaceId?: string;
    sessionIds?: string[];
  };
}

class StoreSyncCoordinator {
  private listeners: SyncCallback[] = [];

  subscribe(callback: SyncCallback): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  emit(event: SyncEvent): void {
    log.debug('Sync event emitted', event);

    const errors: Array<{ error: Error; listener: number }> = [];

    this.listeners.forEach((callback, index) => {
      try {
        callback(event);
      } catch (error) {
        log.error('Sync callback error', { error, event, listenerIndex: index });
        errors.push({ error: error as Error, listener: index });
      }
    });

    // If any listeners failed, log summary
    if (errors.length > 0) {
      log.warn('Sync event had partial failures', {
        event,
        failedListeners: errors.length,
        totalListeners: this.listeners.length,
      });

      // For critical events, log at error level
      if (event.type === 'session_created' || event.type === 'workspace_deleted') {
        log.error('Critical sync event had failures - data consistency may be affected', {
          event,
          failedCount: errors.length,
          errors: errors.map(e => e.error.message),
          recommendation: 'Refresh page to restore sync',
        });
      }
    }
  }

  // Convenience methods
  sessionCreated(sessionId: string, workspaceId: string): void {
    this.emit({
      type: 'session_created',
      payload: { sessionId, workspaceId },
    });
  }

  sessionDeleted(sessionId: string, workspaceId?: string): void {
    this.emit({
      type: 'session_deleted',
      payload: { sessionId, workspaceId },
    });
  }

  workspaceDeleted(workspaceId: string, sessionIds: string[]): void {
    this.emit({
      type: 'workspace_deleted',
      payload: { workspaceId, sessionIds },
    });
  }

  sessionLinked(sessionId: string, workspaceId: string): void {
    this.emit({
      type: 'session_linked',
      payload: { sessionId, workspaceId },
    });
  }

  sessionUnlinked(sessionId: string, workspaceId: string): void {
    this.emit({
      type: 'session_unlinked',
      payload: { sessionId, workspaceId },
    });
  }
}

// Singleton instance
export const storeSync = new StoreSyncCoordinator();

// NOTE: Subscriptions persist for application lifetime.
// This is acceptable because stores are singletons and live for entire app.
// Subscriptions will be set up inside each store's creator function.
