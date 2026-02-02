/**
 * PTY Manager - Server-side PTY session management
 * Handles spawning, managing, and cleaning up PTY processes
 */

import * as pty from 'node-pty';
import * as os from 'os';
import * as path from 'path';
import { PTYInstance, PTYSpawnOptions } from './types';

export class PTYManager {
  private sessions: Map<string, PTYInstance> = new Map();
  private idCounter = 0;

  /**
   * Spawn a new PTY session
   */
  spawn(options: PTYSpawnOptions = {}): PTYInstance {
    const id = this.generateId();

    // Determine shell
    const shell = options.shell || process.env.SHELL || this.getDefaultShell();

    // Determine working directory
    const cwd = options.cwd || process.env.HOME || os.homedir();

    // Environment variables
    const env = {
      ...process.env,
      ...options.env,
      TERM: 'xterm-256color',
    };

    // Spawn PTY
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd,
      env,
    });

    const instance: PTYInstance = {
      id,
      pty: ptyProcess,
      cwd,
      createdAt: new Date(),
    };

    this.sessions.set(id, instance);

    console.log(`[PTYManager] Spawned PTY session ${id} in ${cwd} with shell ${shell}`);

    return instance;
  }

  /**
   * Get PTY instance by ID
   */
  get(id: string): PTYInstance | undefined {
    return this.sessions.get(id);
  }

  /**
   * Write input to PTY
   */
  write(id: string, data: string): boolean {
    const instance = this.sessions.get(id);
    if (!instance) {
      console.error(`[PTYManager] PTY session ${id} not found`);
      return false;
    }

    try {
      instance.pty.write(data);
      return true;
    } catch (error) {
      console.error(`[PTYManager] Error writing to PTY ${id}:`, error);
      return false;
    }
  }

  /**
   * Resize PTY
   */
  resize(id: string, cols: number, rows: number): boolean {
    const instance = this.sessions.get(id);
    if (!instance) {
      console.error(`[PTYManager] PTY session ${id} not found`);
      return false;
    }

    try {
      instance.pty.resize(cols, rows);
      console.log(`[PTYManager] Resized PTY ${id} to ${cols}x${rows}`);
      return true;
    } catch (error) {
      console.error(`[PTYManager] Error resizing PTY ${id}:`, error);
      return false;
    }
  }

  /**
   * Kill PTY session
   */
  kill(id: string): boolean {
    const instance = this.sessions.get(id);
    if (!instance) {
      console.error(`[PTYManager] PTY session ${id} not found`);
      return false;
    }

    try {
      instance.pty.kill();
      this.sessions.delete(id);
      console.log(`[PTYManager] Killed PTY session ${id}`);
      return true;
    } catch (error) {
      console.error(`[PTYManager] Error killing PTY ${id}:`, error);
      return false;
    }
  }

  /**
   * Kill all PTY sessions
   */
  killAll(): void {
    console.log(`[PTYManager] Killing all ${this.sessions.size} PTY sessions`);
    for (const [id, instance] of this.sessions) {
      try {
        instance.pty.kill();
      } catch (error) {
        console.error(`[PTYManager] Error killing PTY ${id}:`, error);
      }
    }
    this.sessions.clear();
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Generate unique session ID
   */
  private generateId(): string {
    return `pty-${Date.now()}-${++this.idCounter}`;
  }

  /**
   * Get default shell for the platform
   */
  private getDefaultShell(): string {
    const platform = os.platform();

    if (platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }

    // Unix-like systems
    return '/bin/bash';
  }
}

// Singleton instance
export const ptyManager = new PTYManager();

// Cleanup on process exit
process.on('exit', () => {
  ptyManager.killAll();
});

process.on('SIGINT', () => {
  ptyManager.killAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  ptyManager.killAll();
  process.exit(0);
});
