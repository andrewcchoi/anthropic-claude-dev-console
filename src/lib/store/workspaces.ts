/**
 * Workspace Zustand Store
 * Client-side state management for workspaces
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import {
  Workspace,
  ProviderConfig,
  ProviderState,
  ConnectionStatus,
  LocalProviderConfig,
  SSHProviderConfig,
} from '../workspace/types';
import { createLogger } from '../logger';
import { storeSync } from './sync';

const log = createLogger('WorkspaceStore');

// Lazy getter for useChatStore to avoid circular dependency
// Will be initialized on first use after both stores are created
let _useChatStore: any = null;
function getChatStore() {
  if (!_useChatStore) {
    // Dynamic import to break circular dependency
    try {
      _useChatStore = require('./index').useChatStore;
    } catch (e) {
      // In test environment, try window/global
      if (typeof window !== 'undefined' && (window as any).useChatStore) {
        _useChatStore = (window as any).useChatStore;
      } else if (typeof global !== 'undefined' && (global as any).useChatStore) {
        _useChatStore = (global as any).useChatStore;
      } else {
        log.debug('useChatStore not available (likely in test environment)');
        return null;
      }
    }
  }
  return _useChatStore;
}

// ============================================================================
// Store Types
// ============================================================================

interface PersistedWorkspaceConfig {
  id: string;
  name: string;
  config: ProviderConfig;
  color: string;
  sessionIds: string[];  // Include session links
}

interface WorkspaceStore {
  // State
  workspaces: Map<string, Workspace>;
  providers: Map<string, ProviderState>;
  activeWorkspaceId: string | null;
  workspaceOrder: string[];
  isInitialized: boolean;
  hasMigratedSessions: boolean;

  // Actions
  addWorkspace: (config: ProviderConfig, options?: { name?: string; color?: string }) => Promise<string>;
  removeWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;

  // Provider actions
  updateProviderStatus: (id: string, status: ConnectionStatus, error?: string) => void;
  connectProvider: (id: string) => Promise<void>;
  disconnectProvider: (id: string) => Promise<void>;

  // Workspace state updates
  updateWorkspaceState: (id: string, updates: Partial<Workspace>) => void;
  setWorkspaceSession: (workspaceId: string, sessionId: string | null) => void;
  toggleFolder: (workspaceId: string, path: string) => void;
  selectFile: (workspaceId: string, path: string | null) => void;
  trackFileActivity: (workspaceId: string, path: string, type: 'read' | 'modified') => void;

  // Session management
  addSessionToWorkspace: (workspaceId: string, sessionId: string) => void;
  removeSessionFromWorkspace: (workspaceId: string, sessionId: string) => void;
  validateLastActiveSession: (workspaceId: string, sessionId?: string) => string | null;
  getMostRecentSessionForWorkspace: (workspaceId: string) => any | null;
  updateWorkspaceLastActiveSession: (workspaceId: string, sessionId: string) => void;

  // Initialization
  initialize: () => Promise<void>;
  migrateFromLegacy: () => Promise<void>;
  migrateExistingSessions: () => void;
}

// ============================================================================
// Workspace Colors
// ============================================================================

const WORKSPACE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

const getNextColor = (existingCount: number): string => {
  return WORKSPACE_COLORS[existingCount % WORKSPACE_COLORS.length];
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => {
      // Set up sync coordinator subscriptions INSIDE store creator
      storeSync.subscribe((event) => {
        const state = get();

        if (event.type === 'session_created' && event.payload.sessionId && event.payload.workspaceId) {
          state.addSessionToWorkspace(event.payload.workspaceId, event.payload.sessionId);
        }

        if (event.type === 'session_deleted' && event.payload.sessionId && event.payload.workspaceId) {
          state.removeSessionFromWorkspace(event.payload.workspaceId, event.payload.sessionId);
        }
      });

      return {
        // Initial state
        workspaces: new Map(),
        providers: new Map(),
        activeWorkspaceId: null,
        workspaceOrder: [],
        isInitialized: false,
        hasMigratedSessions: false,

      // ========================================================================
      // Workspace Actions
      // ========================================================================

      addWorkspace: async (config, options = {}) => {
        const id = config.id ?? uuidv4();
        const state = get();

        // Check if already exists
        if (state.workspaces.has(id)) {
          return id;
        }

        // Create provider state
        const providerState: ProviderState = {
          id,
          config,
          status: 'disconnected',
          connectionSettings: {
            persistConnection: (config as any).persistConnection ?? false,
            reconnectOnFailure: (config as any).reconnectOnFailure ?? true,
          },
        };

        // Derive name from config
        let name = options.name;
        if (!name) {
          switch (config.type) {
            case 'local':
              name = config.path.split('/').pop() ?? 'Local';
              break;
            case 'git':
              name = config.repoUrl.split('/').pop()?.replace('.git', '') ?? 'Git Repo';
              break;
            case 'ssh':
              name = `${config.username}@${config.host}`;
              break;
            default:
              name = 'Workspace';
          }
        }

        // Create workspace
        const workspace: Workspace = {
          id,
          name,
          providerId: id,
          providerType: config.type,
          rootPath: config.type === 'local'
            ? (config as LocalProviderConfig).path
            : config.type === 'ssh'
              ? (config as SSHProviderConfig).remotePath
              : config.type === 'git'
                ? '/'  // TODO: Update when git clone location is implemented
                : '/',
          color: options.color ?? getNextColor(state.workspaces.size),
          sessionId: null,
          sessionIds: [],  // Initialize empty array
          expandedFolders: new Set(),
          selectedFile: null,
          fileActivity: new Map(),
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        };

        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const newProviders = new Map(state.providers);

          newWorkspaces.set(id, workspace);
          newProviders.set(id, providerState);

          return {
            workspaces: newWorkspaces,
            providers: newProviders,
            workspaceOrder: [...state.workspaceOrder, id],
            activeWorkspaceId: state.activeWorkspaceId ?? id,
          };
        });

        return id;
      },

      removeWorkspace: async (id) => {
        const state = get();
        const workspace = state.workspaces.get(id);

        if (!workspace) return;

        // Unlink all sessions from this workspace (batch operation)
        log.debug('Unlinking sessions before workspace removal', {
          workspaceId: id,
          sessionCount: workspace.sessionIds.length,
        });

        // Emit workspace deletion event to trigger batch unlink in chat store
        if (workspace.sessionIds.length > 0) {
          storeSync.workspaceDeleted(id, workspace.sessionIds);
        }

        // Disconnect provider if connected
        const provider = state.providers.get(workspace.providerId);
        if (provider?.status === 'connected') {
          try {
            await get().disconnectProvider(workspace.providerId);
          } catch {
            // Ignore disconnect errors during removal
          }
        }

        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const newProviders = new Map(state.providers);

          newWorkspaces.delete(id);
          newProviders.delete(workspace.providerId);

          const newOrder = state.workspaceOrder.filter(i => i !== id);
          const newActiveId = state.activeWorkspaceId === id
            ? newOrder[0] ?? null
            : state.activeWorkspaceId;

          log.debug('Workspace removed', {
            workspaceId: id,
            remainingWorkspaces: newOrder.length,
            newActiveId,
          });

          return {
            workspaces: newWorkspaces,
            providers: newProviders,
            workspaceOrder: newOrder,
            activeWorkspaceId: newActiveId,
          };
        });
      },

      setActiveWorkspace: (id) => {
        const workspace = get().workspaces.get(id);
        if (!workspace) return;

        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const ws = newWorkspaces.get(id);
          if (ws) {
            ws.lastAccessedAt = Date.now();
          }

          return {
            workspaces: newWorkspaces,
            activeWorkspaceId: id,
          };
        });
      },

      reorderWorkspaces: (fromIndex, toIndex) => {
        set((state) => {
          const newOrder = [...state.workspaceOrder];
          const [moved] = newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, moved);
          return { workspaceOrder: newOrder };
        });
      },

      // ========================================================================
      // Session Management
      // ========================================================================

      addSessionToWorkspace: (workspaceId, sessionId) => {
        try {
          set((state) => {
            const newWorkspaces = new Map(state.workspaces);
            const workspace = newWorkspaces.get(workspaceId);

            if (!workspace) {
              log.warn('Workspace not found', { workspaceId });
              return state;
            }

            if (workspace.sessionIds.includes(sessionId)) {
              return state; // Already added
            }

            // Create new workspace object with new sessionIds array (immutable)
            const updatedWorkspace = {
              ...workspace,
              sessionIds: [...workspace.sessionIds, sessionId], // ✅ NEW ARRAY
            };

            newWorkspaces.set(workspaceId, updatedWorkspace);

            log.debug('Added session to workspace', {
              workspaceId,
              sessionId,
              sessionCount: updatedWorkspace.sessionIds.length,
            });

            return { workspaces: newWorkspaces };
          });
        } catch (error) {
          log.error('Failed to add session to workspace', {
            error,
            workspaceId,
            sessionId,
          });
        }
      },

      removeSessionFromWorkspace: (workspaceId, sessionId) => {
        try {
          set((state) => {
            const newWorkspaces = new Map(state.workspaces);
            const workspace = newWorkspaces.get(workspaceId);

            if (!workspace) {
              return state;
            }

            // Create new workspace object with filtered sessionIds array (immutable)
            const updatedWorkspace = {
              ...workspace,
              sessionIds: workspace.sessionIds.filter(id => id !== sessionId), // ✅ NEW ARRAY
            };

            newWorkspaces.set(workspaceId, updatedWorkspace);

            log.debug('Removed session from workspace', {
              workspaceId,
              sessionId,
              remainingCount: updatedWorkspace.sessionIds.length,
            });

            return { workspaces: newWorkspaces };
          });
        } catch (error) {
          log.error('Failed to remove session from workspace', {
            error,
            workspaceId,
            sessionId,
          });
        }
      },

      validateLastActiveSession: (workspaceId, sessionId) => {
        if (!sessionId) return null;

        try {
          const useChatStore = getChatStore();
          const chatStore = useChatStore.getState();
          const session = chatStore.sessions.find((s: any) => s.id === sessionId);

          if (!session) {
            log.warn('lastActiveSessionId not found', { workspaceId, sessionId });
            return null;
          }

          if (session.workspaceId !== workspaceId) {
            log.warn('lastActiveSessionId workspace mismatch', {
              workspaceId,
              sessionId,
              sessionWorkspaceId: session.workspaceId,
            });
            return null;
          }

          return sessionId;
        } catch (error) {
          log.error('Failed to validate session', { error, workspaceId, sessionId });
          return null;
        }
      },

      getMostRecentSessionForWorkspace: (workspaceId) => {
        const useChatStore = getChatStore();
        const chatStore = useChatStore.getState();
        const workspaceSessions = chatStore.sessions.filter(
          (s: any) => s.workspaceId === workspaceId
        );

        if (workspaceSessions.length === 0) return null;

        // Sort by updated_at descending, return first
        const sorted = [...workspaceSessions].sort((a: any, b: any) => {
          const aTime = a.updated_at || a.created_at || 0;
          const bTime = b.updated_at || b.created_at || 0;
          return bTime - aTime;
        });

        return sorted[0];
      },

      updateWorkspaceLastActiveSession: (workspaceId, sessionId) => {
        set((state) => {
          const workspace = state.workspaces.get(workspaceId);
          if (!workspace) {
            log.warn('Workspace not found for lastActiveSessionId update', {
              workspaceId,
              sessionId,
            });
            return state;
          }

          const updatedWorkspace = {
            ...workspace,
            lastActiveSessionId: sessionId,
          };

          const newWorkspaces = new Map(state.workspaces);
          newWorkspaces.set(workspaceId, updatedWorkspace);

          return { workspaces: newWorkspaces };
        });
      },

      // ========================================================================
      // Provider Actions
      // ========================================================================

      updateProviderStatus: (id, status, error) => {
        set((state) => {
          const newProviders = new Map(state.providers);
          const provider = newProviders.get(id);

          if (provider) {
            newProviders.set(id, {
              ...provider,
              status,
              error,
              lastConnected: status === 'connected' ? Date.now() : provider.lastConnected,
            });
          }

          return { providers: newProviders };
        });
      },

      connectProvider: async (id) => {
        get().updateProviderStatus(id, 'connecting');

        try {
          const state = get();
          const providerState = state.providers.get(id);

          if (!providerState) {
            throw new Error(`Provider ${id} not found`);
          }

          // Call API to connect
          const response = await fetch('/api/workspace/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, config: providerState.config }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message ?? 'Connection failed');
          }

          get().updateProviderStatus(id, 'connected');
        } catch (error) {
          get().updateProviderStatus(
            id,
            'error',
            error instanceof Error ? error.message : 'Unknown error'
          );
          throw error;
        }
      },

      disconnectProvider: async (id) => {
        try {
          await fetch('/api/workspace/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });

          get().updateProviderStatus(id, 'disconnected');
        } catch (error) {
          get().updateProviderStatus(
            id,
            'error',
            error instanceof Error ? error.message : 'Unknown error'
          );
          throw error;
        }
      },

      // ========================================================================
      // Workspace State Updates
      // ========================================================================

      updateWorkspaceState: (id, updates) => {
        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const workspace = newWorkspaces.get(id);

          if (workspace) {
            newWorkspaces.set(id, { ...workspace, ...updates });
          }

          return { workspaces: newWorkspaces };
        });
      },

      setWorkspaceSession: (workspaceId, sessionId) => {
        get().updateWorkspaceState(workspaceId, { sessionId });
      },

      toggleFolder: (workspaceId, path) => {
        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const workspace = newWorkspaces.get(workspaceId);

          if (workspace) {
            const newExpanded = new Set(workspace.expandedFolders);
            if (newExpanded.has(path)) {
              newExpanded.delete(path);
            } else {
              newExpanded.add(path);
            }
            newWorkspaces.set(workspaceId, {
              ...workspace,
              expandedFolders: newExpanded,
            });
          }

          return { workspaces: newWorkspaces };
        });
      },

      selectFile: (workspaceId, path) => {
        get().updateWorkspaceState(workspaceId, { selectedFile: path });
      },

      trackFileActivity: (workspaceId, path, type) => {
        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const workspace = newWorkspaces.get(workspaceId);

          if (workspace) {
            const newActivity = new Map(workspace.fileActivity);
            newActivity.set(path, type);
            newWorkspaces.set(workspaceId, {
              ...workspace,
              fileActivity: newActivity,
            });
          }

          return { workspaces: newWorkspaces };
        });
      },

      // ========================================================================
      // Initialization
      // ========================================================================

      initialize: async () => {
        if (get().isInitialized) return;

        // Check for legacy workspace and migrate
        await get().migrateFromLegacy();

        // Migrate existing sessions to default workspace (idempotent)
        get().migrateExistingSessions();

        set({ isInitialized: true });
      },

      migrateFromLegacy: async () => {
        const state = get();

        // Only migrate if no workspaces exist
        if (state.workspaces.size > 0) return;

        // Check if /workspace exists (legacy DevContainer setup)
        try {
          const response = await fetch('/api/files?path=/workspace');
          if (response.ok) {
            // Create local workspace for /workspace
            await state.addWorkspace(
              {
                type: 'local',
                path: '/workspace',
              },
              {
                name: 'Current Workspace',
                color: WORKSPACE_COLORS[0],
              }
            );

            console.log('[WorkspaceStore] Migrated legacy /workspace');
          }
        } catch {
          // Ignore errors during migration check
        }
      },

      migrateExistingSessions: () => {
        // Idempotency check - only migrate once
        if (get().hasMigratedSessions) {
          log.debug('Sessions already migrated, skipping');
          return;
        }

        const state = get();

        // Get chat store using lazy getter to avoid circular dependency
        const useChatStore = getChatStore();
        if (!useChatStore) {
          log.debug('ChatStore not available, skipping migration');
          set({ hasMigratedSessions: true });
          return;
        }

        const { sessions } = useChatStore.getState();

        // Only migrate if there are unlinked sessions
        const unlinkedSessions = sessions.filter((s: any) => !s.workspaceId);
        if (unlinkedSessions.length === 0) {
          log.debug('No sessions to migrate');
          set({ hasMigratedSessions: true });
          return;
        }

        // Find "Current Workspace" (the /workspace one)
        const defaultWorkspace = Array.from(state.workspaces.values())
          .find(ws => ws.rootPath === '/workspace');

        if (!defaultWorkspace) {
          log.warn('No default workspace found for migration');
          set({ hasMigratedSessions: true });
          return;
        }

        log.info('Migrating existing sessions to default workspace', {
          defaultWorkspaceId: defaultWorkspace.id,
          unlinkedSessionCount: unlinkedSessions.length,
          totalSessionCount: sessions.length,
        });

        // Link all unlinked sessions to default workspace
        // Note: linkSessionToWorkspace emits session_linked event, which triggers
        // workspace store subscription to call addSessionToWorkspace automatically
        unlinkedSessions.forEach((session: any) => {
          useChatStore.getState().linkSessionToWorkspace(session.id, defaultWorkspace.id);
        });

        log.info('Migration complete', {
          migratedCount: unlinkedSessions.length,
        });

        // Mark migration as complete
        set({ hasMigratedSessions: true });
      },
      };
    },
    {
      name: 'claude-workspaces-v1',

      // Serialize Maps and Sets for storage
      partialize: (state) => ({
        workspaceConfigs: Array.from(state.workspaces.values()).map(ws => ({
          id: ws.id,
          name: ws.name,
          config: state.providers.get(ws.providerId)?.config,
          color: ws.color,
          sessionIds: ws.sessionIds,  // Persist session links
        })) as PersistedWorkspaceConfig[],
        workspaceOrder: state.workspaceOrder,
        activeWorkspaceId: state.activeWorkspaceId,
        hasMigratedSessions: state.hasMigratedSessions,
      }),

      // Deserialize on rehydration
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Rebuild Maps from persisted configs
        const workspaces = new Map<string, Workspace>();
        const providers = new Map<string, ProviderState>();

        const configs = (state as any).workspaceConfigs as PersistedWorkspaceConfig[] | undefined;
        if (configs) {
          for (const wc of configs) {
            if (!wc.config) continue;

            // Recreate provider state
            providers.set(wc.id, {
              id: wc.id,
              config: wc.config,
              status: 'disconnected',
              connectionSettings: {
                persistConnection: (wc.config as any).persistConnection ?? false,
                reconnectOnFailure: (wc.config as any).reconnectOnFailure ?? true,
              },
            });

            // Recreate workspace
            workspaces.set(wc.id, {
              id: wc.id,
              name: wc.name,
              providerId: wc.id,
              providerType: wc.config.type,
              rootPath: wc.config.type === 'local'
                ? (wc.config as LocalProviderConfig).path
                : wc.config.type === 'ssh'
                  ? (wc.config as SSHProviderConfig).remotePath
                  : wc.config.type === 'git'
                    ? '/'  // TODO: Update when git clone location is implemented
                    : '/',
              color: wc.color,
              sessionId: null,
              sessionIds: wc.sessionIds || [],  // Restore session links (type-safe)
              expandedFolders: new Set(),
              selectedFile: null,
              fileActivity: new Map(),
              createdAt: Date.now(),
              lastAccessedAt: Date.now(),
            });
          }
        }

        state.workspaces = workspaces;
        state.providers = providers;
        state.isInitialized = false;
      },
    }
  )
);

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get active workspace with provider
 */
export function useActiveWorkspace() {
  const activeId = useWorkspaceStore(s => s.activeWorkspaceId);
  const workspace = useWorkspaceStore(s =>
    activeId ? s.workspaces.get(activeId) : undefined
  );
  const provider = useWorkspaceStore(s =>
    workspace ? s.providers.get(workspace.providerId) : undefined
  );

  return {
    workspace,
    provider,
    isConnected: provider?.status === 'connected',
    rootPath: workspace?.rootPath ?? '/workspace',
  };
}
