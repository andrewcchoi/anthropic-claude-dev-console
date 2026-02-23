/**
 * WorkspaceHistory
 * Tracks recent workspaces and favorites
 */

interface HistoryEntry {
  workspaceId: string;
  lastAccessed: number;
  accessCount: number;
}

const MAX_HISTORY = 10;
const STORAGE_KEY = 'claude-workspace-history';

export class WorkspaceHistory {
  private history: Map<string, HistoryEntry> = new Map();
  private favorites: Set<string> = new Set();

  constructor() {
    this.load();
  }

  /**
   * Record workspace access
   */
  recordAccess(workspaceId: string): void {
    const entry = this.history.get(workspaceId) ?? {
      workspaceId,
      lastAccessed: 0,
      accessCount: 0,
    };

    entry.lastAccessed = Date.now();
    entry.accessCount++;

    this.history.set(workspaceId, entry);
    this.evictOld();
    this.save();
  }

  /**
   * Get recent workspaces (sorted by last accessed)
   */
  getRecent(limit = MAX_HISTORY): string[] {
    return Array.from(this.history.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit)
      .map(e => e.workspaceId);
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(workspaceId: string): void {
    if (this.favorites.has(workspaceId)) {
      this.favorites.delete(workspaceId);
    } else {
      this.favorites.add(workspaceId);
    }
    this.save();
  }

  /**
   * Check if workspace is favorited
   */
  isFavorite(workspaceId: string): boolean {
    return this.favorites.has(workspaceId);
  }

  /**
   * Get all favorites
   */
  getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  /**
   * Evict old entries beyond limit
   */
  private evictOld(): void {
    if (this.history.size <= MAX_HISTORY) return;

    const entries = Array.from(this.history.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );

    const toRemove = entries.slice(0, this.history.size - MAX_HISTORY);

    for (const entry of toRemove) {
      // Don't evict favorites
      if (!this.favorites.has(entry.workspaceId)) {
        this.history.delete(entry.workspaceId);
      }
    }
  }

  /**
   * Save to localStorage
   */
  private save(): void {
    try {
      const data = {
        history: Array.from(this.history.values()),
        favorites: Array.from(this.favorites),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save workspace history:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);

      for (const entry of data.history ?? []) {
        this.history.set(entry.workspaceId, entry);
      }

      for (const id of data.favorites ?? []) {
        this.favorites.add(id);
      }
    } catch (error) {
      console.warn('Failed to load workspace history:', error);
    }
  }
}

// Singleton instance
let instance: WorkspaceHistory | null = null;

export function getWorkspaceHistory(): WorkspaceHistory {
  if (!instance) {
    instance = new WorkspaceHistory();
  }
  return instance;
}
