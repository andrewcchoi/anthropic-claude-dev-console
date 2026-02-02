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
import { createServerLogger } from '../src/lib/logger/server';

const log = createServerLogger('TerminalServer');

const PORT = process.env.TERMINAL_PORT || 3001;
const HOST = process.env.TERMINAL_HOST || '0.0.0.0';

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
  log.info('New WebSocket connection');

  // Spawn new PTY session
  const instance = ptyManager.spawn({
    cwd: process.env.HOME || '/workspace',
    cols: 80,
    rows: 24,
  });

  const sessionId = instance.id;
  connections.set(sessionId, ws);

  log.info('Created PTY session', { sessionId });

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
    log.info('PTY session exited', { sessionId, exitCode });

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
          log.warn('Unknown message type', { type: (message as any).type, sessionId });
      }
    } catch (error) {
      log.error('Error parsing message', { error, sessionId });
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
    log.info('WebSocket closed', { sessionId });
    connections.delete(sessionId);
    ptyManager.kill(sessionId);
  });

  // Handle WebSocket error
  ws.on('error', (error) => {
    log.error('WebSocket error', { sessionId, error });
    connections.delete(sessionId);
    ptyManager.kill(sessionId);
  });
});

// Start server
httpServer.listen(PORT, () => {
  log.info('WebSocket server listening', { url: `ws://${HOST}:${PORT}/terminal` });
  log.info('Health check available', { url: `http://${HOST}:${PORT}/health` });
});

// Graceful shutdown
process.on('SIGINT', () => {
  log.info('Shutting down gracefully');

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close();
  });

  // Close server
  wss.close(() => {
    httpServer.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
