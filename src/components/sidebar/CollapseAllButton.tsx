'use client';

import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { createLogger } from '@/lib/logger';

const log = createLogger('CollapseAllButton');

export function CollapseAllButton() {
  const { collapseAll, expandAll, collapsedProjects, collapsedSections } = useChatStore();
  const { workspaces } = useWorkspaceStore();

  // Compute expansion states
  const allWorkspaceIds = Array.from(workspaces.keys());

  // Fully collapsed: all sections collapsed AND all workspaces collapsed
  const allSectionsCollapsed = collapsedSections.has('workspaces') &&
    collapsedSections.has('system') &&
    collapsedSections.has('unassigned');
  const allWorkspacesCollapsed = allWorkspaceIds.length > 0 &&
    allWorkspaceIds.every(id => collapsedProjects.has(id));
  const fullyCollapsed = allSectionsCollapsed && allWorkspacesCollapsed;

  // Partially expanded: sections open BUT workspaces still collapsed
  const sectionsExpanded = !allSectionsCollapsed;
  const partiallyExpanded = sectionsExpanded && allWorkspacesCollapsed;

  const handleClick = () => {
    log.debug('Collapse/Expand all clicked', {
      fullyCollapsed,
      partiallyExpanded,
      sectionsExpanded,
      allWorkspacesCollapsed,
      workspaceCount: allWorkspaceIds.length
    });

    if (fullyCollapsed) {
      // First click: expand sections only (first level)
      expandAll(false);
    } else if (partiallyExpanded) {
      // Second click: expand workspaces too (second level)
      expandAll(true);
    } else {
      // Any other state: collapse everything
      collapseAll();
    }
  };

  const iconClass = "w-4 h-4";

  // Show expand icon when fully or partially collapsed
  const showExpandIcon = fullyCollapsed || partiallyExpanded;

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-600 transition-all duration-150 text-gray-500 dark:text-gray-400"
      title={
        fullyCollapsed
          ? 'Expand sections (first level)'
          : partiallyExpanded
          ? 'Expand workspaces (second level)'
          : 'Collapse all sections and workspaces'
      }
      aria-label={
        fullyCollapsed
          ? 'Expand sections (first level)'
          : partiallyExpanded
          ? 'Expand workspaces (second level)'
          : 'Collapse all sections and workspaces'
      }
    >
      {showExpandIcon ? (
        <ChevronsDownUp className={iconClass} />
      ) : (
        <ChevronsUpDown className={iconClass} />
      )}
    </button>
  );
}
