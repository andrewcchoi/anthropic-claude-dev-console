'use client';

import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { createLogger } from '@/lib/logger';

const log = createLogger('CollapseAllButton');

export function CollapseAllButton() {
  const { collapseAll, expandAll, collapsedProjects, collapsedSections } = useChatStore();
  const { workspaces } = useWorkspaceStore();

  // Compute if all are collapsed
  // Check: all workspaces collapsed AND all sections (workspaces, system, unassigned) collapsed
  const allWorkspaceIds = Array.from(workspaces.keys());
  const allCollapsed = allWorkspaceIds.length > 0 &&
    allWorkspaceIds.every(id => collapsedProjects.has(id)) &&
    collapsedSections.has('workspaces') &&
    collapsedSections.has('system') &&
    collapsedSections.has('unassigned');

  const handleClick = () => {
    log.debug('Collapse/Expand all clicked', { allCollapsed, workspaceCount: allWorkspaceIds.length });

    if (allCollapsed) {
      expandAll();
    } else {
      collapseAll();
    }
  };

  const iconClass = "w-4 h-4";

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-600 transition-all duration-150 text-gray-500 dark:text-gray-400"
      title={allCollapsed ? 'Expand all sections and workspaces' : 'Collapse all sections and workspaces'}
      aria-label={allCollapsed ? 'Expand all sections and workspaces' : 'Collapse all sections and workspaces'}
    >
      {allCollapsed ? (
        <ChevronsDownUp className={iconClass} />
      ) : (
        <ChevronsUpDown className={iconClass} />
      )}
    </button>
  );
}
