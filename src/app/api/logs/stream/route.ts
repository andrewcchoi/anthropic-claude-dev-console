/**
 * Log Streaming API
 * Server-Sent Events (SSE) endpoint for real-time log viewing
 */

import { NextRequest } from 'next/server';
import { logStream, enableLogStreaming } from '@/lib/logger/log-stream';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Enable log streaming
  enableLogStreaming();

  // Create SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );

      // Send recent logs
      const recentLogs = logStream.getLogs(50);
      for (const log of recentLogs) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'log', log })}\n\n`)
        );
      }

      // Listen for new logs
      const logHandler = (log: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'log', log })}\n\n`)
          );
        } catch (error) {
          // Client disconnected, ignore
        }
      };

      logStream.on('log', logHandler);

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`)
          );
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        logStream.off('log', logHandler);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
