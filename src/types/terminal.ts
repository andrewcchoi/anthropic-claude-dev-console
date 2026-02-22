/**
 * Terminal type definitions
 * Shared types for terminal sessions, messages, and configuration
 */

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  active: boolean;
  createdAt: Date;
}

export interface TerminalConfig {
  fontSize: number;
  theme: 'dark' | 'light';
  scrollback: number;
  cursorBlink: boolean;
  fontFamily: string;
}

// WebSocket message types
export type TerminalMessage =
  | TerminalInputMessage
  | TerminalResizeMessage
  | TerminalOutputMessage
  | TerminalConnectedMessage
  | TerminalExitMessage
  | TerminalErrorMessage;

export interface TerminalInputMessage {
  type: 'input';
  data: string;
}

export interface TerminalResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

export interface TerminalOutputMessage {
  type: 'output';
  data: string;
}

export interface TerminalConnectedMessage {
  type: 'connected';
  id: string;
}

export interface TerminalExitMessage {
  type: 'exit';
  code: number;
}

export interface TerminalErrorMessage {
  type: 'error';
  message: string;
}

// PTY configuration
export interface PTYConfig {
  shell?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cols?: number;
  rows?: number;
}

// PTY instance
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

// Legacy message types (for compatibility)
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
