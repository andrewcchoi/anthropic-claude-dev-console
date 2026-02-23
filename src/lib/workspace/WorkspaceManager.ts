/**
 * WorkspaceManager
 * Central orchestrator for workspace and provider management
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import { WorkspaceProvider } from './WorkspaceProvider';
import {
  Workspace,
  WorkspaceConfig,
  ProviderConfig,
  ProviderState,
  ConnectionStatus,
  WorkspaceEvents,
  WORKSPACE_LIMITS,
} from './types';
import { LimitError, NotFoundError, ConnectionError, wrapError } from './errors';
import { LocalProvider } from './providers/LocalProvider';

// Workspace colors for visual distinction
const WORKSPACE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

type TypedEventEmitter = {
  on<E extends keyof WorkspaceEvents>(
    event: E,
    listener: (data: WorkspaceEvents[E]) => void
  ): void;
  off<E extends keyof WorkspaceEvents>(
    event: E,
    listener: (data: WorkspaceEvents[E]) => void
  ): void;
  emit<E extends keyof WorkspaceEvents>(event: E, data: WorkspaceEvents[E]): boolean;
};

export class WorkspaceManager {
  private providers: Map<string, WorkspaceProvider> = new Map();
  private providerStates: Map<string, ProviderState> = new Map();
  private workspaces: Map<string, Workspace> = new Map();
  private activeWorkspaceId: string | null = null;
  private workspaceOrder: string[] = [];
  private eventEmitter: EventEmitter & TypedEventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter() as EventEmitter & TypedEventEmitter;
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  on<E extends keyof WorkspaceEvents>(
    event: E,
    listener: (data: WorkspaceEvents[E]) => void
  ): void {
    this.eventEmitter.on(event, listener as (...args: unknown[]) => void);
  }

  off<E extends keyof WorkspaceEvents>(
    event: E,
    listener: (data: WorkspaceEvents[E]) => void
  ): void {
    this.eventEmitter.off(event, listener as (...args: unknown[]) => void);
  }

  private emit<E extends keyof WorkspaceEvents>(event: E, data: WorkspaceEvents[E]): void {
    this.eventEmitter.emit(event, data);
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  /**
   * Register and connect a provider
   */
  async registerProvider(config: ProviderConfig): Promise<WorkspaceProvider> {
    // Check limits
    if (this.providers.size >= WORKSPACE_LIMITS.maxWorkspaces) {
      throw new LimitError('workspaces', this.providers.size, WORKSPACE_LIMITS.maxWorkspaces);
    }

    const id = config.id ?? uuidv4();
    const provider = this.createProvider({ ...config, id });

    // Initialize provider state
    this.providerStates.set(id, {
      id,
      config,
      status: 'disconnected',
      connectionSettings: {
        persistConnection: (config as any).persistConnection ?? false,
        reconnectOnFailure: (config as any).reconnectOnFailure ?? true,
      },
    });

    this.providers.set(id, provider);
    return provider;
  }

  /**
   * Create a provider instance based on config
   */
  private createProvider(config: ProviderConfig & { id: string }): WorkspaceProvider {
    switch (config.type) {
      case 'local':
        return new LocalProvider({
          ...config,
          id: config.id,
          name: config.name ?? config.path.split('/').pop() ?? 'Local',
        });

      case 'git':
        // GitProvider will be implemented in Phase 2
        throw new Error('Git provider not yet implemented');

      case 'ssh':
        // SSHProvider will be implemented in Phase 3
        throw new Error('SSH provider not yet implemented');

      default:
        throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }

  /**
   * Unregister a provider and cleanup
   */
  async unregisterProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new NotFoundError('provider', id);
    }

    // Disconnect if connected
    if (provider.isConnected()) {
      await provider.disconnect();
    }

    // Remove associated workspaces
    for (const [wsId, ws] of this.workspaces) {
      if (ws.providerId === id) {
        this.workspaces.delete(wsId);
        this.workspaceOrder = this.workspaceOrder.filter(i => i !== wsId);
      }
    }

    this.providers.delete(id);
    this.providerStates.delete(id);
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): WorkspaceProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get provider state
   */
  getProviderState(id: string): ProviderState | undefined {
    return this.providerStates.get(id);
  }

  /**
   * Connect a provider
   */
  async connectProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    const state = this.providerStates.get(id);

    if (!provider || !state) {
      throw new NotFoundError('provider', id);
    }

    this.updateProviderStatus(id, 'connecting');

    try {
      await provider.connect();
      this.updateProviderStatus(id, 'connected');
      this.emit('provider:connected', { providerId: id });
    } catch (error) {
      const wrappedError = wrapError(error, 'connect', id);
      this.updateProviderStatus(id, 'error', wrappedError.message);
      this.emit('provider:disconnected', { providerId: id, error: wrappedError });
      throw wrappedError;
    }
  }

  /**
   * Disconnect a provider
   */
  async disconnectProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new NotFoundError('provider', id);
    }

    try {
      await provider.disconnect();
      this.updateProviderStatus(id, 'disconnected');
      this.emit('provider:disconnected', { providerId: id });
    } catch (error) {
      const wrappedError = wrapError(error, 'disconnect', id);
      this.updateProviderStatus(id, 'error', wrappedError.message);
      throw wrappedError;
    }
  }

  /**
   * Update provider status
   */
  private updateProviderStatus(id: string, status: ConnectionStatus, error?: string): void {
    const state = this.providerStates.get(id);
    if (state) {
      state.status = status;
      state.error = error;
      if (status === 'connected') {
        state.lastConnected = Date.now();
      }
    }
  }

  // ============================================================================
  // Workspace Management
  // ============================================================================

  /**
   * Create a workspace from a provider
   */
  async createWorkspace(
    providerId: string,
    config: WorkspaceConfig = {}
  ): Promise<Workspace> {
    const provider = this.providers.get(providerId);
    const providerState = this.providerStates.get(providerId);

    if (!provider || !providerState) {
      throw new NotFoundError('provider', providerId);
    }

    // Connect if not connected
    if (!provider.isConnected()) {
      await this.connectProvider(providerId);
    }

    const id = uuidv4();
    const colorIndex = this.workspaces.size % WORKSPACE_COLORS.length;

    const workspace: Workspace = {
      id,
      name: config.name ?? provider.name,
      providerId,
      providerType: provider.type,
      rootPath: provider.rootPath,
      color: config.color ?? WORKSPACE_COLORS[colorIndex],
      sessionId: null,
      expandedFolders: new Set(),
      selectedFile: null,
      fileActivity: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.workspaces.set(id, workspace);
    this.workspaceOrder.push(id);

    // Set as active if first workspace
    if (!this.activeWorkspaceId) {
      this.activeWorkspaceId = id;
    }

    this.emit('workspace:added', { workspace });

    return workspace;
  }

  /**
   * Remove a workspace
   */
  async removeWorkspace(id: string): Promise<void> {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      throw new NotFoundError('workspace', id);
    }

    this.workspaces.delete(id);
    this.workspaceOrder = this.workspaceOrder.filter(i => i !== id);

    // If active workspace removed, switch to next
    if (this.activeWorkspaceId === id) {
      this.activeWorkspaceId = this.workspaceOrder[0] ?? null;
      if (this.activeWorkspaceId) {
        const newActive = this.workspaces.get(this.activeWorkspaceId);
        if (newActive) {
          this.emit('workspace:activated', { workspace: newActive });
        }
      }
    }

    this.emit('workspace:removed', { workspaceId: id });
  }

  /**
   * Get a workspace by ID
   */
  getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  /**
   * Get all workspaces
   */
  getWorkspaces(): Workspace[] {
    return this.workspaceOrder.map(id => this.workspaces.get(id)!).filter(Boolean);
  }

  /**
   * Get active workspace
   */
  getActiveWorkspace(): Workspace | null {
    return this.activeWorkspaceId
      ? this.workspaces.get(this.activeWorkspaceId) ?? null
      : null;
  }

  /**
   * Set active workspace
   */
  setActiveWorkspace(id: string): void {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      throw new NotFoundError('workspace', id);
    }

    this.activeWorkspaceId = id;
    workspace.lastAccessedAt = Date.now();

    this.emit('workspace:activated', { workspace });
  }

  /**
   * Reorder workspaces (for drag-drop)
   */
  reorderWorkspaces(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.workspaceOrder.length) return;
    if (toIndex < 0 || toIndex >= this.workspaceOrder.length) return;

    const [moved] = this.workspaceOrder.splice(fromIndex, 1);
    this.workspaceOrder.splice(toIndex, 0, moved);
  }

  /**
   * Update workspace properties
   */
  updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'name' | 'color' | 'sessionId'>>): void {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      throw new NotFoundError('workspace', id);
    }

    Object.assign(workspace, updates);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get provider for a workspace
   */
  getWorkspaceProvider(workspaceId: string): WorkspaceProvider | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;
    return this.providers.get(workspace.providerId);
  }

  /**
   * Get connection status for a workspace
   */
  getWorkspaceConnectionStatus(workspaceId: string): ConnectionStatus {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return 'disconnected';

    const state = this.providerStates.get(workspace.providerId);
    return state?.status ?? 'disconnected';
  }

  /**
   * Cleanup all providers and workspaces
   */
  async cleanup(): Promise<void> {
    for (const provider of this.providers.values()) {
      if (provider.isConnected()) {
        try {
          await provider.disconnect();
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    this.providers.clear();
    this.providerStates.clear();
    this.workspaces.clear();
    this.workspaceOrder = [];
    this.activeWorkspaceId = null;
  }
}

// Export singleton instance
export const workspaceManager = new WorkspaceManager();
