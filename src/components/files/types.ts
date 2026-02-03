export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
}

export interface GitStatus {
  isGitRepo: boolean;
  modified: string[];
  untracked: string[];
  ignored: string[];
}

export interface FileTreeItemProps {
  item: FileItem;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  gitStatus: GitStatus;
  activityType?: 'read' | 'modified';
  onToggle: () => void;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
}

export interface FileContextMenuProps {
  position: { x: number; y: number } | null;
  item: FileItem | null;
  onClose: () => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}
