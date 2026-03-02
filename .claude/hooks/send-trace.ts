#!/usr/bin/env tsx
/**
 * Send session trace to LangSmith
 * Called by stop.sh hook when session ends
 */

import { readFileSync } from 'fs';
import { Client } from 'langsmith';

interface SessionData {
  sessionId: string;
  duration: number;
  startTime: number;
  endTime: number;
  workDir: string;
  timestamp: string;
}

async function sendTrace(dataFile: string) {
  try {
    // Read session data
    const data: SessionData = JSON.parse(readFileSync(dataFile, 'utf-8'));
    
    // Check if tracing is enabled
    const apiKey = process.env.LANGSMITH_API_KEY;
    const project = process.env.LANGSMITH_PROJECT || 'pr-virtual-helmet-80';
    const enabled = process.env.LANGSMITH_TRACING === 'true';
    
    if (!enabled || !apiKey) {
      console.log('LangSmith tracing disabled');
      process.exit(0);
    }
    
    // Initialize LangSmith client
    const client = new Client({ apiKey });
    
    // Create trace for the session
    await client.createRun({
      name: `Session: ${data.sessionId}`,
      run_type: 'chain',
      inputs: {
        workDir: data.workDir,
        sessionId: data.sessionId,
      },
      outputs: {
        duration: data.duration,
        durationMinutes: Math.round(data.duration / 60),
      },
      start_time: data.startTime * 1000, // Convert to milliseconds
      end_time: data.endTime * 1000,
      project_name: project,
      extra: {
        metadata: {
          source: 'claude-code-stop-hook',
          timestamp: data.timestamp,
        },
      },
    });
    
    console.log(`✓ Session trace sent to LangSmith (${project})`);
  } catch (error) {
    // Don't fail the hook if LangSmith is down
    console.error('Failed to send trace to LangSmith:', error instanceof Error ? error.message : error);
    process.exit(0); // Exit cleanly
  }
}

const dataFile = process.argv[2];
if (!dataFile) {
  console.error('Usage: send-trace.ts <data-file>');
  process.exit(1);
}

sendTrace(dataFile).catch(console.error);
