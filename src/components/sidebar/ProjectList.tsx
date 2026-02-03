'use client';

import { useState, useEffect, useRef } from 'react';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { SessionItem } from './SessionItem';

export function ProjectList() {
  const { projects, sessions } = useSessionDiscoveryStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  // Auto-expand the workspace project on initial load
  useEffect(() => {
    if (projects.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const workspaceProject = projects.find((p) => p.id === '-workspace');
      if (workspaceProject) {
        setExpandedProjects(new Set([workspaceProject.id]));
      }
    }
  }, [projects]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  if (projects.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No projects found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const projectSessions = sessions.filter((s) => s.projectId === project.id);
        const isExpanded = expandedProjects.has(project.id);

        return (
          <div key={project.id} className="space-y-1">
            {/* Project header */}
            <button
              onClick={() => toggleProject(project.id)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {project.path === '/workspace' ? 'Current Workspace' : project.path}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </button>

            {/* Project sessions */}
            {isExpanded && projectSessions.length > 0 && (
              <div className="ml-6 space-y-1">
                {projectSessions.map((session) => (
                  <SessionItem key={session.id} session={session} />
                ))}
              </div>
            )}

            {isExpanded && projectSessions.length === 0 && (
              <div className="ml-6 text-sm text-gray-500 dark:text-gray-400 py-2">
                No sessions in this project
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
