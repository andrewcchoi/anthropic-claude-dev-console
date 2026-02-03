// Extended session types for CLI session discovery

export interface Project {
  id: string;           // Encoded path (e.g., "-workspace")
  path: string;         // Decoded path (e.g., "/workspace")
  sessionCount: number;
  lastActivity: number;
}

export interface CLISession {
  id: string;
  projectId: string;
  source: 'web' | 'cli';
  filePath: string;
  fileSize: number;
  modifiedAt: number;
  createdAt: number;
  name: string;
  // Lazy-loaded fields
  messageCount?: number;
  gitBranch?: string;
  cwd?: string;
  isLoading?: boolean;
}

export interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary?: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch?: string;
  projectPath: string;
  isSidechain: boolean;
}

export interface SessionIndex {
  version: number;
  entries: SessionIndexEntry[];
}

export interface DiscoverResponse {
  projects: Project[];
  sessions: CLISession[];
  totalSessions: number;
  scanDurationMs: number;
}
