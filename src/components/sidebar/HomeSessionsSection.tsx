// src/components/sidebar/HomeSessionsSection.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import type { CLISession } from '@/types/sessions';
import { createLogger } from '@/lib/logger';

const log = createLogger('HomeSessionsSection');

interface HomeSessionsSectionProps {
  workspaceId: string;
  sessions: CLISession[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export function HomeSessionsSection({
  workspaceId,
  sessions,
  isCollapsed,
  onToggle,
}: HomeSessionsSectionProps) {
  log.debug('HomeSessionsSection render', {
    workspaceId,
    sessionCount: sessions.length,
    isCollapsed,
  });

  return (
    <section
      className="mt-2"
      aria-label="Home sessions for workspace"
      role="region"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-green-50 dark:bg-green-950/20
                   text-green-900 dark:text-green-100
                   hover:bg-green-100 dark:hover:bg-green-950/30
                   focus:ring-2 focus:ring-green-500/50 focus:outline-none
                   transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`home-sessions-${workspaceId}`}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <span className="text-sm font-medium">
            🏠 Home Sessions ({sessions.length})
          </span>
        </div>
      </button>

      {/* Session List */}
      {!isCollapsed && (
        <div
          id={`home-sessions-${workspaceId}`}
          className="ml-6 mt-1 space-y-1"
        >
          {sessions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-200">
              No home sessions
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                sectionType="home"
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
