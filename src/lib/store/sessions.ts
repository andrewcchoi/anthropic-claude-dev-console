import { create } from 'zustand';
import { CLISession, Project, DiscoverResponse } from '@/types/sessions';
import { createLogger } from '../logger';

const log = createLogger('SessionDiscoveryStore');

interface SessionDiscoveryState {
  projects: Project[];
  sessions: CLISession[];
  isDiscovering: boolean;
  lastDiscoveryTime: number | null;
  discoverSessions: (quick?: boolean) => Promise<void>;
  loadSessionDetails: (sessionId: string) => Promise<void>;
}

export const useSessionDiscoveryStore = create<SessionDiscoveryState>((set, get) => ({
  projects: [],
  sessions: [],
  isDiscovering: false,
  lastDiscoveryTime: null,

  discoverSessions: async (quick = false) => {
    const { isDiscovering } = get();
    if (isDiscovering) {
      log.debug('Discovery already in progress, skipping');
      return;
    }

    set({ isDiscovering: true });

    try {
      log.debug('Starting session discovery', { quick });
      const response = await fetch(`/api/sessions/discover${quick ? '?quick=true' : ''}`);

      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.statusText}`);
      }

      const data: DiscoverResponse = await response.json();
      log.debug('Discovery complete', {
        projects: data.projects.length,
        sessions: data.sessions.length,
        duration: data.scanDurationMs,
      });

      set({
        projects: data.projects,
        sessions: data.sessions,
        isDiscovering: false,
        lastDiscoveryTime: Date.now(),
      });
    } catch (error) {
      log.error('Session discovery failed', { error });
      set({
        isDiscovering: false,
      });
    }
  },

  loadSessionDetails: async (sessionId: string) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      log.warn('Session not found', { sessionId });
      return;
    }

    if (session.isLoading) {
      log.debug('Session details already loading', { sessionId });
      return;
    }

    // Mark as loading
    set({
      sessions: sessions.map((s) =>
        s.id === sessionId ? { ...s, isLoading: true } : s
      ),
    });

    try {
      log.debug('Loading session details', { sessionId });
      const url = `/api/sessions/${sessionId}/messages?project=${encodeURIComponent(session.projectId)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const data = await response.json();
      const messageCount = Array.isArray(data) ? data.length : (data.messages?.length || 0);

      // Update session with loaded details
      set({
        sessions: sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messageCount,
                isLoading: false,
              }
            : s
        ),
      });

      log.debug('Session details loaded', { sessionId, messageCount });
    } catch (error) {
      log.error('Failed to load session details', { sessionId, error });
      // Remove loading state on error
      set({
        sessions: sessions.map((s) =>
          s.id === sessionId ? { ...s, isLoading: false } : s
        ),
      });
    }
  },
}));
