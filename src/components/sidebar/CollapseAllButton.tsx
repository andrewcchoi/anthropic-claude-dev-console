'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { createLogger } from '@/lib/logger';

const log = createLogger('CollapseAllButton');

export function CollapseAllButton() {
  const { collapseAll, expandAll, collapsedProjects, collapsedSections } = useChatStore();
  const { workspaces } = useWorkspaceStore();

  // Compute if all are collapsed
  const allWorkspaceIds = Array.from(workspaces.keys());
  const allCollapsed = allWorkspaceIds.length > 0 &&
    allWorkspaceIds.every(id => collapsedProjects.has(id)) &&
    allWorkspaceIds.every(id => collapsedSections.has(`home-${id}`)) &&
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

  return (
    <button
      onClick={handleClick}
      className="w-full px-3 py-2 text-sm font-medium flex items-center justify-between
                 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg
                 focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                 transition-colors"
      aria-label={allCollapsed ? 'Expand all sections and workspaces' : 'Collapse all sections and workspaces'}
    >
      <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
      {allCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
    </button>
  );
}
