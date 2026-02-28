// src/components/sidebar/UnassignedSessionsSection.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import type { CLISession } from '@/types/sessions';
import { createLogger } from '@/lib/logger';

const log = createLogger('UnassignedSessionsSection');

interface UnassignedSessionsSectionProps {
  workspaceId: string;
  sessions: CLISession[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export function UnassignedSessionsSection({
  workspaceId,
  sessions,
  isCollapsed,
  onToggle,
}: UnassignedSessionsSectionProps) {
  log.debug('UnassignedSessionsSection render', {
    workspaceId,
    sessionCount: sessions.length,
    isCollapsed,
  });

  return (
    <section
      className="mt-2"
      aria-label="Unassigned sessions for workspace"
      role="region"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-orange-50 dark:bg-orange-950/20
                   text-orange-900 dark:text-orange-100
                   hover:bg-orange-100 dark:hover:bg-orange-950/30
                   transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`unassigned-sessions-${workspaceId}`}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <span className="text-sm font-medium">
            ❓ Unassigned Sessions ({sessions.length})
          </span>
        </div>
      </button>

      {/* Session List */}
      {!isCollapsed && (
        <div
          id={`unassigned-sessions-${workspaceId}`}
          className="ml-6 mt-1 space-y-1"
        >
          {sessions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No unassigned sessions
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                // @ts-expect-error - sectionType will be added in Phase 3 Task 3.1
                sectionType="unassigned"
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
