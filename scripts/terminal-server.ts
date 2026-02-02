#!/usr/bin/env node
/**
 * Terminal WebSocket Server
 * Standalone server that provides WebSocket connections to PTY sessions
 * Runs on port 3001
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { ptyManager } from '../src/lib/terminal/pty-manager';
import { TerminalClientMessage, TerminalServerMessage } from '../src/lib/terminal/types';

const PORT = process.env.TERMINAL_PORT || 3001;
const HOST = process.env.TERMINAL_HOST || 'localhost';

// Create HTTP server for health checks
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      sessions: ptyManager.getSessionCount(),
      uptime: process.uptime(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({
  server: httpServer,
  path: '/terminal'
});

// Track WebSocket connections
const connections = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('[TerminalServer] New WebSocket connection');

  // Spawn new PTY session
  const instance = ptyManager.spawn({
    cwd: process.env.HOME || '/workspace',
    cols: 80,
    rows: 24,
  });

  const sessionId = instance.id;
  connections.set(sessionId, ws);

  console.log(`[TerminalServer] Created PTY session ${sessionId}`);

  // Send connected message
  const connectedMessage: TerminalServerMessage = {
    type: 'connected',
    id: sessionId,
  };
  ws.send(JSON.stringify(connectedMessage));

  // Handle PTY output
  instance.pty.onData((data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      const outputMessage: TerminalServerMessage = {
        type: 'output',
        data,
      };
      ws.send(JSON.stringify(outputMessage));
    }
  });

  // Handle PTY exit
  instance.pty.onExit(({ exitCode }: { exitCode: number }) => {
    console.log(`[TerminalServer] PTY session ${sessionId} exited with code ${exitCode}`);

    if (ws.readyState === WebSocket.OPEN) {
      const exitMessage: TerminalServerMessage = {
        type: 'exit',
        code: exitCode,
      };
      ws.send(JSON.stringify(exitMessage));
      ws.close();
    }

    connections.delete(sessionId);
    ptyManager.kill(sessionId);
  });

  // Handle WebSocket messages
  ws.on('message', (rawMessage: Buffer) => {
    try {
      const message: TerminalClientMessage = JSON.parse(rawMessage.toString());

      switch (message.type) {
        case 'input':
          if (message.data) {
            ptyManager.write(sessionId, message.data);
          }
          break;

        case 'resize':
          if (message.cols && message.rows) {
            ptyManager.resize(sessionId, message.cols, message.rows);
          }
          break;

        default:
          console.warn(`[TerminalServer] Unknown message type: ${(message as any).type}`);
      }
    } catch (error) {
      console.error('[TerminalServer] Error parsing message:', error);
      if (ws.readyState === WebSocket.OPEN) {
        const errorMessage: TerminalServerMessage = {
          type: 'error',
          message: 'Invalid message format',
        };
        ws.send(JSON.stringify(errorMessage));
      }
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`[TerminalServer] WebSocket closed for session ${sessionId}`);
    connections.delete(sessionId);
    ptyManager.kill(sessionId);
  });

  // Handle WebSocket error
  ws.on('error', (error) => {
    console.error(`[TerminalServer] WebSocket error for session ${sessionId}:`, error);
    connections.delete(sessionId);
    ptyManager.kill(sessionId);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`[TerminalServer] WebSocket server listening on ws://${HOST}:${PORT}/terminal`);
  console.log(`[TerminalServer] Health check available at http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[TerminalServer] Shutting down gracefully...');

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close();
  });

  // Close server
  wss.close(() => {
    httpServer.close(() => {
      console.log('[TerminalServer] Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\n[TerminalServer] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('[TerminalServer] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[TerminalServer] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
