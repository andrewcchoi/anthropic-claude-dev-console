// src/components/sidebar/SystemSessionsSection.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import type { CLISession } from '@/types/sessions';
import { createLogger } from '@/lib/logger';

const log = createLogger('SystemSessionsSection');

interface SystemSessionsSectionProps {
  workspaceId: string;
  sessions: CLISession[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SystemSessionsSection({
  workspaceId,
  sessions,
  isCollapsed,
  onToggle,
}: SystemSessionsSectionProps) {
  log.debug('SystemSessionsSection render', {
    workspaceId,
    sessionCount: sessions.length,
    isCollapsed,
  });

  return (
    <section
      className="mt-2"
      aria-label="System sessions for workspace"
      role="region"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-blue-50 dark:bg-blue-950/20
                   text-blue-900 dark:text-blue-100
                   hover:bg-blue-100 dark:hover:bg-blue-950/30
                   transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`system-sessions-${workspaceId}`}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <span className="text-sm font-medium">
            🛠️ System Sessions ({sessions.length})
          </span>
        </div>
      </button>

      {/* Session List */}
      {!isCollapsed && (
        <div
          id={`system-sessions-${workspaceId}`}
          className="ml-6 mt-1 space-y-1"
        >
          {sessions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No system sessions
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                // @ts-expect-error - sectionType will be added in Phase 3 Task 3.1
                sectionType="system"
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
