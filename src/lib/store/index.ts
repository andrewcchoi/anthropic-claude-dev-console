import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, Session, ToolExecution, UsageStats, Provider, ProviderConfig, DefaultMode } from '@/types/claude';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger';

const log = createLogger('ChatStore');

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
  setSessionId: (id: string) => void;
  setCurrentSession: (session: Session | null) => void;
  addSession: (session: Session) => void;
  startNewSession: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  updateSessionName: (sessionId: string, name: string) => void;
  deleteSession: (sessionId: string) => void;
  saveCurrentSession: () => void;

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
  toggleFolder: (path: string) => void;
  selectFile: (path: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  trackFileActivity: (path: string, type: 'read' | 'modified') => void;
  setSidebarTab: (tab: 'sessions' | 'files') => void;
  setPendingInputText: (text: string | null) => void;
  clearExpandedFolders: () => void;
  expandFolders: (paths: string[]) => void;

  // UI State
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
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
    (set, get) => ({
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
      setSessionId: (id) => set({ sessionId: id }),
      setCurrentSession: (session) => set({ currentSession: session }),
      addSession: (session) =>
        set((state) => ({ sessions: [...state.sessions, session] })),

      startNewSession: () => {
        const newSessionId = uuidv4();
        log.debug('Starting new session', { id: newSessionId });
        set({
          sessionId: newSessionId,
          currentSession: null,
          messages: [],
          toolExecutions: [],
          sessionUsage: null,
          error: null,
          currentModel: null,
        });
      },

      switchSession: async (id) => {
        const currentId = get().sessionId;
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
          log.debug('Switching session', { from: currentId, to: id });
          // Set loading state but DON'T clear messages yet
          set({ isLoadingHistory: true });

          try {
            // Fetch messages from CLI session file
            const response = await fetch(`/api/sessions/${id}/messages`);
            if (response.ok) {
              const messages: ChatMessage[] = await response.json();
              // Atomic update - switch everything at once
              set({
                sessionId: session.id,
                currentSession: session,
                messages,
                toolExecutions: [],
                sessionUsage: null,
                isLoadingHistory: false,
              });
            } else {
              // Failed to load messages, but continue with empty state
              set({
                sessionId: session.id,
                currentSession: session,
                messages: [],
                toolExecutions: [],
                sessionUsage: null,
                isLoadingHistory: false,
              });
            }
          } catch (error) {
            log.error('Failed to load session messages', { error });
            // Continue with empty state on error
            set({
              sessionId: session.id,
              currentSession: session,
              messages: [],
              toolExecutions: [],
              sessionUsage: null,
              isLoadingHistory: false,
            });
          }
        }
      },

      saveCurrentSession: () => {
        const { sessionId, sessions, messages, currentSession } = get();

        // Already saved a session for this conversation - don't duplicate
        if (currentSession) return;

        if (!sessionId || sessions.some((s) => s.id === sessionId)) return;

        log.debug('Saving session', { id: sessionId });

        const name =
          messages.find((m) => m.role === 'user')?.content?.[0]?.text?.slice(0, 50) ||
          'New Chat';
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
        }));
      },

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          ...(state.sessionId === id
            ? {
                sessionId: null,
                currentSession: null,
                messages: [],
                toolExecutions: [],
                sessionUsage: null,
              }
            : {}),
        })),

      updateSessionName: (id, name) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, name, updated_at: Date.now() } : s
          ),
        })),

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

      // File browser
      expandedFolders: new Set<string>(),
      selectedFile: null,
      previewOpen: false,
      fileActivity: new Map<string, 'read' | 'modified'>(),
      sidebarTab: 'sessions',
      pendingInputText: null,
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
      clearExpandedFolders: () => set({ expandedFolders: new Set<string>() }),
      expandFolders: (paths) => set({ expandedFolders: new Set(paths) }),
    }),
    {
      name: 'claude-code-sessions',
      partialize: (state) => ({
        sessions: state.sessions,
        // sessionId: state.sessionId, // Don't persist - prevents conflicts
        currentSession: state.currentSession,
        preferredModel: state.preferredModel,
        provider: state.provider,
        providerConfig: state.providerConfig,
        defaultMode: state.defaultMode,
        sidebarTab: state.sidebarTab,
      }),
    }
  )
);
