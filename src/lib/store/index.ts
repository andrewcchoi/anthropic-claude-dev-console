import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, Session, ToolExecution, UsageStats, Provider, ProviderConfig, DefaultMode } from '@/types/claude';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger';
import { storeSync } from './sync';

const log = createLogger('ChatStore');

type MetadataColorScheme = 'semantic' | 'gradient';

// Lazy getter for useWorkspaceStore to avoid circular dependency
let _useWorkspaceStore: any = null;
function getWorkspaceStore() {
  if (!_useWorkspaceStore) {
    try {
      _useWorkspaceStore = require('./workspaces').useWorkspaceStore;
    } catch (e) {
      // In test environment, try window/global
      if (typeof window !== 'undefined' && (window as any).useWorkspaceStore) {
        _useWorkspaceStore = (window as any).useWorkspaceStore;
      } else if (typeof global !== 'undefined' && (global as any).useWorkspaceStore) {
        _useWorkspaceStore = (global as any).useWorkspaceStore;
      } else {
        log.error('useWorkspaceStore not available');
      }
    }
  }
  return _useWorkspaceStore;
}

interface TerminalSession {
  sessionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  cwd?: string;
  error?: string;
}

interface ChatStore {
  // Messages
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // Session
  sessionId: string | null;
  sessions: Session[];
  currentSession: Session | null;
  isLoadingHistory: boolean;
  hiddenSessionIds: Set<string>;
  collapsedProjects: Set<string>;
  collapsedSections: Set<string>;
  pendingSessionId: string | null;
  initializedSessionIds: Set<string>;  // Track sessions that have sent at least one message
  setSessionId: (id: string) => void;
  markSessionInitialized: (id: string) => void;
  setCurrentSession: (session: Session | null) => void;
  addSession: (session: Session) => void;
  startNewSession: (workspaceId?: string, cwd?: string) => string;
  switchSession: (sessionId: string, projectId?: string) => Promise<void>;
  updateSessionName: (sessionId: string, name: string) => void;
  deleteSession: (sessionId: string) => void;
  hideSession: (sessionId: string) => void;
  toggleProjectCollapse: (projectId: string) => void;
  toggleSectionCollapse: (sectionId: string) => void;
  collapseAll: () => void;
  expandAll: (expandWorkspaces?: boolean) => void;
  saveCurrentSession: () => void;

  // NEW: Workspace-session linking
  unlinkSessionFromWorkspace: (sessionId: string) => void;
  linkSessionToWorkspace: (sessionId: string, workspaceId: string) => void;
  unlinkMultipleSessionsFromWorkspace: (sessionIds: string[]) => void;  // NEW: Batch unlink

  // Init data from CLI
  availableCommands: string[];
  availableTools: string[];
  availableSkills: string[];
  mcpServers: Array<{ name: string; status: string }>;
  cliVersion: string | null;
  workingDirectory: string;
  activePermissionMode: string;
  setInitInfo: (info: {
    model?: string;
    sessionId?: string;
    tools?: string[];
    commands?: string[];
    skills?: string[];
    mcpServers?: Array<{ name: string; status: string }>;
    cliVersion?: string;
    cwd?: string;
    permissionMode?: string;
  }) => void;

  // UI panels
  isStatusPanelOpen: boolean;
  isHelpPanelOpen: boolean;
  isModelPanelOpen: boolean;
  isTodosPanelOpen: boolean;
  isRenameDialogOpen: boolean;
  isWorkspaceDialogOpen: boolean;
  isSettingsPanelOpen: boolean;
  setStatusPanelOpen: (open: boolean) => void;
  setHelpPanelOpen: (open: boolean) => void;
  setModelPanelOpen: (open: boolean) => void;
  setTodosPanelOpen: (open: boolean) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setWorkspaceDialogOpen: (open: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  clearChat: () => void;

  // Session cache for preserving messages when switching
  sessionCache: Map<string, {
    messages: ChatMessage[];
    toolExecutions: ToolExecution[];
    timestamp: number;
  }>;
  cacheCurrentSession: () => void;
  getCachedSession: (id: string) => { messages: ChatMessage[]; toolExecutions: ToolExecution[] } | null;

  // Model selection
  currentModel: string | null;
  setCurrentModel: (model: string | null) => void;
  preferredModel: string | null;
  setPreferredModel: (model: string | null) => void;

  // Provider selection
  provider: Provider;
  providerConfig: ProviderConfig;
  setProvider: (provider: Provider) => void;
  setProviderConfig: (config: Partial<ProviderConfig>) => void;

  // Default mode selection
  defaultMode: DefaultMode;
  setDefaultMode: (mode: DefaultMode) => void;

  // Metadata color scheme
  metadataColorScheme: MetadataColorScheme;
  setMetadataColorScheme: (scheme: MetadataColorScheme) => void;

  // Tool executions
  toolExecutions: ToolExecution[];
  addToolExecution: (tool: ToolExecution) => void;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  clearToolExecutions: () => void;

  // Terminal sessions
  terminalSessions: Map<string, TerminalSession>;
  openTerminalSession: (toolId: string, cwd?: string) => void;
  closeTerminalSession: (toolId: string) => void;
  updateTerminalStatus: (toolId: string, status: TerminalSession['status'], error?: string) => void;

  // File browser
  expandedFolders: Set<string>;
  selectedFile: string | null;
  previewOpen: boolean;
  fileActivity: Map<string, 'read' | 'modified'>;
  sidebarTab: 'sessions' | 'files';
  pendingInputText: string | null;
  searchQuery: string | null;
  toggleFolder: (path: string) => void;
  selectFile: (path: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  trackFileActivity: (path: string, type: 'read' | 'modified') => void;
  setSidebarTab: (tab: 'sessions' | 'files') => void;
  setPendingInputText: (text: string | null) => void;
  setSearchQuery: (query: string | null) => void;
  clearExpandedFolders: () => void;
  expandFolders: (paths: string[]) => void;

  // UI State
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isPrewarming: boolean;
  setIsPrewarming: (prewarming: boolean) => void;
  prewarmError: string | null;
  setPrewarmError: (error: string | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  // Usage tracking
  sessionUsage: UsageStats | null;
  updateUsage: (stats: Partial<UsageStats>) => void;
  resetUsage: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      // Set up sync coordinator subscriptions INSIDE store creator
      storeSync.subscribe((event) => {
        if (event.type === 'workspace_deleted' && event.payload.sessionIds) {
          const state = get();
          state.unlinkMultipleSessionsFromWorkspace(event.payload.sessionIds);
        }
      });

      return {
        // Messages
        messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),
      clearMessages: () => set({ messages: [], sessionUsage: null }),

      // Session
      sessionId: null,
      sessions: [],
      currentSession: null,
      isLoadingHistory: false,
      hiddenSessionIds: new Set<string>(),
      collapsedProjects: new Set<string>(),
      collapsedSections: new Set<string>(),
      pendingSessionId: null,
      initializedSessionIds: new Set<string>(),
      setSessionId: (id) => set({ sessionId: id }),
      setCurrentSession: (session) => set({ currentSession: session }),
      markSessionInitialized: (id) =>
        set((state) => {
          const newInitialized = new Set(state.initializedSessionIds);
          newInitialized.add(id);
          return { initializedSessionIds: newInitialized };
        }),
      addSession: (session) =>
        set((state) => ({ sessions: [...state.sessions, session] })),

      startNewSession: (workspaceId?: string, cwd?: string) => {
        const currentId = get().sessionId;
        if (currentId) {
          get().cacheCurrentSession();
        }

        // Use provided cwd or fallback to default
        const effectiveCwd = cwd || '/workspace';

        const newSessionId = uuidv4();
        const newSession: Session = {
          id: newSessionId,
          name: 'New Chat',
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: effectiveCwd,
          workspaceId,  // Can be undefined for unassigned sessions
        };

        log.debug('Creating session with workspace context', {
          sessionId: newSessionId,
          workspaceId: workspaceId || 'none',
          cwd: effectiveCwd,
          hasWorkspace: !!workspaceId,
        });

        set((state) => {
          // Emit sync event for workspace store to handle
          if (workspaceId) {
            storeSync.sessionCreated(newSessionId, workspaceId);
          }

          return {
            sessionId: newSessionId,
            currentSession: null,  // Keep null - not confirmed yet
            pendingSessionId: newSessionId,  // Track as pending
            sessions: [newSession, ...state.sessions],
            messages: [],
            toolExecutions: [],
            sessionUsage: null,
            error: null,
            currentModel: null,
          };
        });
        return newSessionId;
      },

      switchSession: async (id, projectId) => {
        const currentId = get().sessionId;
        const { pendingSessionId, sessions } = get();
        const localSession = sessions.find((s) => s.id === id);

        // Cache current session before switching
        if (currentId && currentId !== id) {
          get().cacheCurrentSession();
        }

        log.debug('Switching session', { from: currentId, to: id, projectId, hasLocal: !!localSession, isPending: id === pendingSessionId });

        // If switching to a pending session (no messages sent yet), don't fetch from API
        if (id === pendingSessionId) {
          const pendingSession = sessions.find(s => s.id === id);
          if (pendingSession) {
            log.debug('Switching to pending session', { id });
            set({
              sessionId: id,
              currentSession: null,  // Still pending
              messages: [],
              toolExecutions: [],
              sessionUsage: null,
              isLoadingHistory: false,
            });

            // Update workspace's lastActiveSessionId even for pending sessions
            if (pendingSession.workspaceId) {
              const useWorkspaceStore = getWorkspaceStore();
              useWorkspaceStore.getState().updateWorkspaceLastActiveSession(pendingSession.workspaceId, id);
            }
            return;
          }
        }

        // Check cache first
        const cached = get().getCachedSession(id);
        if (cached) {
          log.debug('Restored session from cache', { id, messages: cached.messages.length });
          const session = localSession || {
            id,
            name: 'Cached Session',
            created_at: Date.now(),
            updated_at: Date.now(),
            cwd: '/workspace',
          };
          set({
            sessionId: id,
            currentSession: session,
            messages: cached.messages,
            toolExecutions: cached.toolExecutions,
            sessionUsage: null,
            isLoadingHistory: false,
          });
          // Mark session as initialized since it has messages (exists on disk)
          if (cached.messages.length > 0) {
            get().markSessionInitialized(id);
          }

          // Update workspace's lastActiveSessionId
          if (session.workspaceId) {
            const useWorkspaceStore = getWorkspaceStore();
            useWorkspaceStore.getState().updateWorkspaceLastActiveSession(session.workspaceId, id);
          }
          return;
        }

        set({ isLoadingHistory: true });

        try {
          // Fetch messages and tool executions from CLI session file
          const url = projectId
            ? `/api/sessions/${id}/messages?project=${encodeURIComponent(projectId)}`
            : `/api/sessions/${id}/messages`;
          const response = await fetch(url);

          if (response.ok) {
            const data = await response.json();

            // Handle both old format (array) and new format (object)
            const messages: ChatMessage[] = Array.isArray(data) ? data : data.messages;
            const toolExecutions: ToolExecution[] = Array.isArray(data) ? [] : (data.toolExecutions || []);

            log.debug('Loaded session data', {
              messages: messages.length,
              toolExecutions: toolExecutions.length
            });

            // Create minimal session object if not found locally
            const session = localSession || {
              id,
              name: messages[0]?.content?.[0]?.text?.slice(0, 50) || 'Untitled',
              created_at: Date.now(),
              updated_at: Date.now(),
              cwd: '/workspace',
            };

            // Atomic update - switch everything at once
            set({
              sessionId: id,
              currentSession: session,
              messages,
              toolExecutions,
              sessionUsage: null,
              isLoadingHistory: false,
            });

            // Mark session as initialized since we loaded messages from disk
            if (messages.length > 0) {
              get().markSessionInitialized(id);
            }

            // Update workspace's lastActiveSessionId
            if (session.workspaceId) {
              const useWorkspaceStore = getWorkspaceStore();
              useWorkspaceStore.getState().updateWorkspaceLastActiveSession(session.workspaceId, id);
            }
          } else {
            // Failed to load messages, but continue with empty state
            log.warn('Failed to load session messages', {
              sessionId: id,
              projectId,
              status: response.status,
              statusText: response.statusText,
            });

            const session = localSession || {
              id,
              name: 'Untitled',
              created_at: Date.now(),
              updated_at: Date.now(),
              cwd: '/workspace',
            };

            set({
              sessionId: id,
              currentSession: session,
              messages: [],
              toolExecutions: [],
              sessionUsage: null,
              isLoadingHistory: false,
            });

            // Update workspace's lastActiveSessionId
            if (session.workspaceId) {
              const useWorkspaceStore = getWorkspaceStore();
              useWorkspaceStore.getState().updateWorkspaceLastActiveSession(session.workspaceId, id);
            }
          }
        } catch (error) {
          log.error('Failed to load session messages', { error });
          // Continue with empty state on error
          const session = localSession || {
            id,
            name: 'Untitled',
            created_at: Date.now(),
            updated_at: Date.now(),
            cwd: '/workspace',
          };

          set({
            sessionId: id,
            currentSession: session,
            messages: [],
            toolExecutions: [],
            sessionUsage: null,
            isLoadingHistory: false,
          });

          // Update workspace's lastActiveSessionId
          if (session.workspaceId) {
            const useWorkspaceStore = getWorkspaceStore();
            useWorkspaceStore.getState().updateWorkspaceLastActiveSession(session.workspaceId, id);
          }
        }
      },

      saveCurrentSession: () => {
        const { sessionId, sessions, messages, pendingSessionId } = get();
        if (!sessionId) return;

        const name = messages.find((m) => m.role === 'user')?.content?.[0]?.text?.slice(0, 50) || 'New Chat';

        // Find existing session (may have been added as pending)
        const existingIndex = sessions.findIndex(s => s.id === pendingSessionId || s.id === sessionId);

        if (existingIndex >= 0) {
          // Update existing session - sync ID if CLI provided different one
          log.debug('Updating existing session', { pendingId: pendingSessionId, finalId: sessionId });
          set((state) => ({
            sessions: state.sessions.map((s, i) =>
              i === existingIndex
                ? { ...s, id: sessionId, name, updated_at: Date.now() }
                : s
            ),
            currentSession: { ...state.sessions[existingIndex], id: sessionId, name },
            pendingSessionId: null,  // No longer pending
          }));
        } else {
          // Shouldn't happen but handle gracefully
          log.debug('Creating new session (no pending found)', { id: sessionId });
          const newSession: Session = {
            id: sessionId,
            name,
            created_at: Date.now(),
            updated_at: Date.now(),
            cwd: '/workspace',
          };
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSession: newSession,
            pendingSessionId: null,
          }));
        }
      },

      deleteSession: (id) => {
        try {
          set((state) => {
            const session = state.sessions.find(s => s.id === id);

            // Remove from workspace's sessionIds before deleting
            if (session?.workspaceId) {
              log.debug('Removing session from workspace before deletion', {
                sessionId: id,
                workspaceId: session.workspaceId,
              });

              // Emit sync event so workspace store can clean up
              storeSync.sessionDeleted(id, session.workspaceId);
            }

            return {
              sessions: state.sessions.filter((s) => s.id !== id),
              ...(state.sessionId === id ? {
                sessionId: null,
                currentSession: null,
                messages: [],
                toolExecutions: [],
                sessionUsage: null,
              } : {}),
            };
          });
        } catch (error) {
          log.error('Failed to delete session', { error, sessionId: id });
        }
      },

      hideSession: (id) =>
        set((state) => ({
          hiddenSessionIds: new Set([...state.hiddenSessionIds, id]),
        })),

      toggleProjectCollapse: (projectId) =>
        set((state) => {
          const next = new Set(state.collapsedProjects);
          if (next.has(projectId)) {
            next.delete(projectId);
          } else {
            next.add(projectId);
          }
          return { collapsedProjects: next };
        }),

      toggleSectionCollapse: (sectionId) =>
        set((state) => {
          const newCollapsed = new Set(state.collapsedSections);
          if (newCollapsed.has(sectionId)) {
            newCollapsed.delete(sectionId);
          } else {
            newCollapsed.add(sectionId);
          }
          return { collapsedSections: newCollapsed };
        }),

      collapseAll: () => {
        const useWorkspaceStore = getWorkspaceStore();
        if (!useWorkspaceStore) {
          log.warn('Cannot collapse all - workspace store not available');
          return;
        }

        const { workspaces } = useWorkspaceStore.getState();
        const allWorkspaceIds: string[] = Array.from(workspaces.keys()) as string[];

        // Sections to collapse: workspaces (parent), system, unassigned
        const allSectionIds: string[] = [
          'workspaces',
          'system',
          'unassigned',
        ];

        log.debug('Collapsing all workspaces and sections', {
          workspaces: allWorkspaceIds.length,
          sections: allSectionIds.length,
        });

        set((state) => {
          const newCollapsedProjects = new Set(state.collapsedProjects);
          const newCollapsedSections = new Set(state.collapsedSections);

          // Collapse all individual workspaces
          allWorkspaceIds.forEach(id => newCollapsedProjects.add(id));

          // Collapse all sections (workspaces, system, unassigned)
          allSectionIds.forEach(id => newCollapsedSections.add(id));

          return {
            collapsedProjects: newCollapsedProjects,
            collapsedSections: newCollapsedSections,
          };
        });
      },

      expandAll: (expandWorkspaces = true) => {
        log.debug('Expanding all', { expandWorkspaces });

        set((state) => ({
          // Always expand sections
          collapsedSections: new Set(),
          // Optionally expand workspaces (for two-level expansion)
          collapsedProjects: expandWorkspaces ? new Set() : state.collapsedProjects,
        }));
      },

      updateSessionName: (id, name) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, name, updated_at: Date.now() } : s
          ),
        })),

      unlinkSessionFromWorkspace: (sessionId) => {
        try {
          let previousWorkspaceId: string | undefined;

          set((state) => {
            const session = state.sessions.find(s => s.id === sessionId);
            previousWorkspaceId = session?.workspaceId;

            if (!session || !previousWorkspaceId) return state;

            log.debug('Unlinking session from workspace', {
              sessionId,
              previousWorkspaceId,
              reason: 'workspace_deleted',
            });

            return {
              sessions: state.sessions.map(s =>
                s.id === sessionId ? { ...s, workspaceId: undefined } : s
              ),
              ...(state.sessionId === sessionId ? { currentSession: { ...session, workspaceId: undefined } } : {}),
            };
          });

          // Emit sync event AFTER state update completes
          if (previousWorkspaceId) {
            storeSync.sessionUnlinked(sessionId, previousWorkspaceId);
          }
        } catch (error) {
          log.error('Failed to unlink session from workspace', { error, sessionId });
        }
      },

      linkSessionToWorkspace: (sessionId, workspaceId) => {
        try {
          let shouldEmitEvent = false;

          set((state) => {
            const session = state.sessions.find(s => s.id === sessionId);
            if (!session) {
              log.warn('Session not found for linking', { sessionId });
              return state;
            }

            log.debug('Linking session to workspace', {
              sessionId,
              workspaceId,
              previousWorkspaceId: session.workspaceId,
            });

            shouldEmitEvent = true;

            return {
              sessions: state.sessions.map(s =>
                s.id === sessionId ? { ...s, workspaceId } : s
              ),
              ...(state.sessionId === sessionId ? { currentSession: { ...session, workspaceId } } : {}),
            };
          });

          // Emit sync event AFTER state update completes
          if (shouldEmitEvent) {
            storeSync.sessionLinked(sessionId, workspaceId);
          }
        } catch (error) {
          log.error('Failed to link session to workspace', { error, sessionId, workspaceId });
        }
      },

      // NEW: Batch unlink for workspace deletion (performance optimization)
      unlinkMultipleSessionsFromWorkspace: (sessionIds: string[]) => {
        try {
          // Convert to Set for O(1) lookup instead of O(m) includes()
          const sessionIdsSet = new Set(sessionIds);

          set((state) => {
            log.debug('Batch unlinking sessions', {
              count: sessionIds.length,
            });

            // Check if current session needs unlinking (with null safety)
            const currentSessionUpdate =
              state.sessionId && sessionIdsSet.has(state.sessionId) && state.currentSession
                ? { currentSession: { ...state.currentSession, workspaceId: undefined } }
                : {};

            return {
              sessions: state.sessions.map(s =>
                sessionIdsSet.has(s.id) ? { ...s, workspaceId: undefined } : s
              ),
              ...currentSessionUpdate,
            };
          });
        } catch (error) {
          log.error('Failed to batch unlink sessions', { error, sessionIds });
        }
      },

      // Tool executions
      toolExecutions: [],
      addToolExecution: (tool) =>
        set((state) => ({ toolExecutions: [...state.toolExecutions, tool] })),
      updateToolExecution: (id, updates) =>
        set((state) => ({
          toolExecutions: state.toolExecutions.map((tool) =>
            tool.id === id ? { ...tool, ...updates } : tool
          ),
        })),
      clearToolExecutions: () => set({ toolExecutions: [] }),

      // Terminal sessions
      terminalSessions: new Map(),
      openTerminalSession: (toolId, cwd) =>
        set((state) => {
          const newSessions = new Map(state.terminalSessions);
          newSessions.set(toolId, {
            sessionId: `term-${toolId}`,
            status: 'connecting',
            cwd,
          });
          return { terminalSessions: newSessions };
        }),
      closeTerminalSession: (toolId) =>
        set((state) => {
          const newSessions = new Map(state.terminalSessions);
          newSessions.delete(toolId);
          return { terminalSessions: newSessions };
        }),
      updateTerminalStatus: (toolId, status, error) =>
        set((state) => {
          const newSessions = new Map(state.terminalSessions);
          const existing = newSessions.get(toolId);
          if (existing) {
            newSessions.set(toolId, {
              ...existing,
              status,
              error,
            });
          }
          return { terminalSessions: newSessions };
        }),

      // UI State
      isStreaming: false,
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),
      error: null,
      setError: (error) => set({ error }),
      isPrewarming: false,
      setIsPrewarming: (prewarming) => set({ isPrewarming: prewarming }),
      prewarmError: null,
      setPrewarmError: (error) => set({ prewarmError: error }),
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      rightPanelOpen: true,
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

      // Usage tracking
      sessionUsage: null,
      updateUsage: (stats) =>
        set((state) => {
          const current = state.sessionUsage || {
            totalCost: 0,
            inputTokens: 0,
            outputTokens: 0,
            durationMs: 0,
            requestCount: 0,
          };
          return {
            sessionUsage: {
              totalCost: current.totalCost + (stats.totalCost || 0),
              inputTokens: current.inputTokens + (stats.inputTokens || 0),
              outputTokens: current.outputTokens + (stats.outputTokens || 0),
              durationMs: current.durationMs + (stats.durationMs || 0),
              requestCount: current.requestCount + (stats.requestCount || 0),
            },
          };
        }),
      resetUsage: () => set({ sessionUsage: null }),

      // Model selection
      currentModel: null,
      setCurrentModel: (model) => set({ currentModel: model }),
      preferredModel: null,
      setPreferredModel: (model) => set({ preferredModel: model }),

      // Provider selection
      provider: 'anthropic',
      providerConfig: {},
      setProvider: (provider) => set({ provider }),
      setProviderConfig: (config) => set((state) => ({
        providerConfig: { ...state.providerConfig, ...config }
      })),

      // Default mode selection
      defaultMode: 'plan',
      setDefaultMode: (mode) => set({ defaultMode: mode }),

      // Metadata color scheme
      metadataColorScheme: 'semantic',
      setMetadataColorScheme: (scheme) => set({ metadataColorScheme: scheme }),

      // Init data from CLI
      availableCommands: [],
      availableTools: [],
      availableSkills: [],
      mcpServers: [],
      cliVersion: null,
      workingDirectory: '/workspace',
      activePermissionMode: 'default',
      setInitInfo: (info) => set((state) => ({
        ...(info.model && { currentModel: info.model }),
        ...(info.sessionId && { sessionId: info.sessionId }),
        availableTools: info.tools || state.availableTools,
        availableCommands: info.commands || state.availableCommands,
        availableSkills: info.skills || state.availableSkills,
        mcpServers: info.mcpServers || state.mcpServers,
        cliVersion: info.cliVersion || state.cliVersion,
        workingDirectory: info.cwd || state.workingDirectory,
        activePermissionMode: info.permissionMode || state.activePermissionMode,
      })),

      // UI panels
      isStatusPanelOpen: false,
      isHelpPanelOpen: false,
      isModelPanelOpen: false,
      isTodosPanelOpen: false,
      isRenameDialogOpen: false,
      isWorkspaceDialogOpen: false,
      isSettingsPanelOpen: false,
      setStatusPanelOpen: (open) => set({ isStatusPanelOpen: open }),
      setHelpPanelOpen: (open) => set({ isHelpPanelOpen: open }),
      setModelPanelOpen: (open) => set({ isModelPanelOpen: open }),
      setTodosPanelOpen: (open) => set({ isTodosPanelOpen: open }),
      setRenameDialogOpen: (open) => set({ isRenameDialogOpen: open }),
      setWorkspaceDialogOpen: (open) => set({ isWorkspaceDialogOpen: open }),
      setSettingsPanelOpen: (open) => set({ isSettingsPanelOpen: open }),
      clearChat: () => set({ messages: [], toolExecutions: [], sessionUsage: null }),

      // Session cache
      sessionCache: new Map(),

      cacheCurrentSession: () => {
        const { sessionId, messages, toolExecutions, sessionCache } = get();
        if (!sessionId || messages.length === 0) return;

        const newCache = new Map(sessionCache);
        newCache.set(sessionId, {
          messages,
          toolExecutions,
          timestamp: Date.now(),
        });

        // LRU: Keep max 5 sessions
        if (newCache.size > 5) {
          const oldest = [...newCache.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
          newCache.delete(oldest[0]);
        }

        set({ sessionCache: newCache });
      },

      getCachedSession: (id) => {
        const cached = get().sessionCache.get(id);
        return cached ? { messages: cached.messages, toolExecutions: cached.toolExecutions } : null;
      },

      // File browser
      expandedFolders: new Set<string>(),
      selectedFile: null,
      previewOpen: false,
      fileActivity: new Map<string, 'read' | 'modified'>(),
      sidebarTab: 'sessions',
      pendingInputText: null,
      searchQuery: null,
      toggleFolder: (path) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          if (newExpanded.has(path)) {
            newExpanded.delete(path);
          } else {
            newExpanded.add(path);
          }
          return { expandedFolders: newExpanded };
        }),
      selectFile: (path) => set({ selectedFile: path }),
      setPreviewOpen: (open) => set({ previewOpen: open }),
      trackFileActivity: (path, type) =>
        set((state) => {
          const newActivity = new Map(state.fileActivity);
          newActivity.set(path, type);
          return { fileActivity: newActivity };
        }),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),
      setPendingInputText: (text) => set({ pendingInputText: text }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearExpandedFolders: () => set({ expandedFolders: new Set<string>() }),
      expandFolders: (paths) => set({ expandedFolders: new Set(paths) }),
      };
    },
    {
      name: 'claude-code-sessions',
      partialize: (state) => ({
        sessions: state.sessions,
        // sessionId: NOT persisted - fresh UUID generated on each page load to avoid conflicts
        currentSession: state.currentSession,
        preferredModel: state.preferredModel,
        provider: state.provider,
        providerConfig: state.providerConfig,
        defaultMode: state.defaultMode,
        metadataColorScheme: state.metadataColorScheme,
        sidebarTab: state.sidebarTab,
        hiddenSessionIds: Array.from(state.hiddenSessionIds), // Convert Set to Array for JSON
        collapsedProjects: Array.from(state.collapsedProjects), // Convert Set to Array for JSON
        collapsedSectionsArray: state.collapsedSections instanceof Set
          ? Array.from(state.collapsedSections)
          : [], // Convert Set to Array for JSON
        // initializedSessionIds: NOT persisted - ephemeral runtime state only
        // pendingSessionId: NOT persisted - resets on refresh
      }),
      onRehydrateStorage: () => (state) => {
        // Convert Array back to Set after rehydration
        if (state && Array.isArray(state.hiddenSessionIds)) {
          state.hiddenSessionIds = new Set(state.hiddenSessionIds);
        } else if (state && !state.hiddenSessionIds) {
          state.hiddenSessionIds = new Set();
        }

        if (state && Array.isArray(state.collapsedProjects)) {
          state.collapsedProjects = new Set(state.collapsedProjects);
        } else if (state && !state.collapsedProjects) {
          state.collapsedProjects = new Set();
        }

        if (state && Array.isArray((state as any).collapsedSectionsArray)) {
          state.collapsedSections = new Set((state as any).collapsedSectionsArray);
        } else if (state) {
          state.collapsedSections = new Set();
        }

        // Always initialize as empty Set (ephemeral, not persisted)
        if (state) {
          state.initializedSessionIds = new Set();
        }

        // Validate sessionId against currentSession to prevent orphaned state
        if (state && state.sessionId && !state.currentSession) {
          state.sessionId = null;
        }
        // If currentSession exists but sessionId doesn't match, sync them
        if (state && state.currentSession && state.sessionId !== state.currentSession.id) {
          state.sessionId = state.currentSession.id;
        }
      },
    }
  )
);
