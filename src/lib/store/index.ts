import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, Session, ToolExecution, UsageStats } from '@/types/claude';
import { v4 as uuidv4 } from 'uuid';

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

  // Tool executions
  toolExecutions: ToolExecution[];
  addToolExecution: (tool: ToolExecution) => void;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  clearToolExecutions: () => void;

  // UI State
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;

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
        set({
          sessionId: newSessionId,
          currentSession: null,
          messages: [],
          toolExecutions: [],
          sessionUsage: null,
          error: null,
        });
      },

      switchSession: async (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
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
            console.error('Failed to load session messages:', error);
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
        const { sessionId, sessions, messages } = get();
        if (!sessionId || sessions.some((s) => s.id === sessionId)) return;

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

      // UI State
      isStreaming: false,
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),
      error: null,
      setError: (error) => set({ error }),
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

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
    }),
    {
      name: 'claude-code-sessions',
      partialize: (state) => ({
        sessions: state.sessions,
        // sessionId: state.sessionId, // Don't persist - prevents conflicts
        currentSession: state.currentSession,
      }),
    }
  )
);
