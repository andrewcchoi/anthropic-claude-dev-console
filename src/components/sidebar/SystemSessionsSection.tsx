// src/components/sidebar/SystemSessionsSection.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import type { CLISession } from '@/types/sessions';
import { createLogger } from '@/lib/logger';

const log = createLogger('SystemSessionsSection');

interface SystemSessionsSectionProps {
  sessions: CLISession[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SystemSessionsSection({
  sessions,
  isCollapsed,
  onToggle,
}: SystemSessionsSectionProps) {
  log.debug('SystemSessionsSection render', {
    sessionCount: sessions.length,
    isCollapsed,
  });

  return (
    <section
      className="mt-2"
      aria-label="System sessions"
      role="region"
    >
      {/* Section Header */}
      <button
        onClick={() => {
          log.debug('System Sessions section toggled', { wasCollapsed: isCollapsed });
          onToggle();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-blue-50 dark:bg-blue-950/20
                   text-blue-900 dark:text-blue-100
                   hover:bg-blue-100 dark:hover:bg-blue-950/30
                   focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                   transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls="system-sessions"
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
          id="system-sessions"
          className="ml-6 mt-1 space-y-1"
        >
          {sessions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-200">
              No system sessions
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                sectionType="system"
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
