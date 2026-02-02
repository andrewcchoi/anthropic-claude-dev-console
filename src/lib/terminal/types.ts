/**
 * Shared types for terminal library
 * Server and client-side terminal types
 */

export interface PTYInstance {
  id: string;
  pty: any; // node-pty IPty type
  cwd: string;
  createdAt: Date;
}

export interface PTYSpawnOptions {
  shell?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
}

export interface TerminalServerMessage {
  type: 'output' | 'connected' | 'exit' | 'error';
  data?: string;
  id?: string;
  code?: number;
  message?: string;
}

export interface TerminalClientMessage {
  type: 'input' | 'resize';
  data?: string;
  cols?: number;
  rows?: number;
}
