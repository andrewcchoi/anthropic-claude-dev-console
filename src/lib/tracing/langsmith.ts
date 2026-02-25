/**
 * LangSmith Tracing Integration for ultrathink-v2
 *
 * Provides observability into subagent workflows:
 * - Phase transitions
 * - Subagent dispatches
 * - Review iterations
 * - Token usage
 *
 * Environment variables (CC_ prefix for Claude Code):
 * - CC_LANGSMITH_API_KEY: API key for authentication
 * - CC_LANGSMITH_PROJECT: Project name for traces
 * - CC_LANGSMITH_DEBUG: Enable debug logging
 * - TRACE_TO_LANGSMITH: Enable/disable tracing
 */

import { Client, RunTree } from 'langsmith';
import { createLogger } from '@/lib/logger';

const log = createLogger('LangSmithTracing');

// Configuration from environment (CC_ prefix)
const config = {
  apiKey: process.env.CC_LANGSMITH_API_KEY,
  project: process.env.CC_LANGSMITH_PROJECT || 'ultrathink-v2',
  debug: process.env.CC_LANGSMITH_DEBUG === 'true',
  enabled: process.env.TRACE_TO_LANGSMITH === 'true',
};

// LangSmith client (lazy initialized)
let client: Client | null = null;

function getClient(): Client | null {
  if (!config.enabled || !config.apiKey) {
    if (config.debug) {
      log.debug('LangSmith tracing disabled', {
        enabled: config.enabled,
        hasApiKey: !!config.apiKey
      });
    }
    return null;
  }

  if (!client) {
    client = new Client({
      apiKey: config.apiKey,
    });
    log.info('LangSmith client initialized', { project: config.project });
  }

  return client;
}

// Active traces by workflow ID
const activeTraces = new Map<string, RunTree>();
const activePhases = new Map<string, RunTree>();

export interface WorkflowMetadata {
  workflowId: string;
  taskDescription: string;
  startedAt: Date;
}

export interface PhaseMetadata {
  workflowId: string;
  phase: string;
  phaseName: string;
  subagentType?: string;
  focusArea?: string;
}

export interface SubagentMetadata {
  workflowId: string;
  phase: string;
  subagentId: string;
  subagentType: string;
  focusArea: string;
  prompt: string;
}

export interface SubagentResult {
  success: boolean;
  output?: string;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
}

/**
 * Start tracing an ultrathink-v2 workflow
 */
export async function startWorkflowTrace(metadata: WorkflowMetadata): Promise<void> {
  const langsmith = getClient();
  if (!langsmith) return;

  try {
    const trace = new RunTree({
      name: `ultrathink-v2: ${metadata.taskDescription}`,
      run_type: 'chain',
      project_name: config.project,
      inputs: {
        task: metadata.taskDescription,
        workflowId: metadata.workflowId,
      },
      extra: {
        metadata: {
          workflow: 'ultrathink-v2',
          version: '2.0.0',
        },
      },
    });

    await trace.postRun();
    activeTraces.set(metadata.workflowId, trace);

    log.info('Started workflow trace', {
      workflowId: metadata.workflowId,
      runId: trace.id,
    });
  } catch (error) {
    log.error('Failed to start workflow trace', { error, metadata });
  }
}

/**
 * Start tracing a phase within the workflow
 */
export async function startPhaseTrace(metadata: PhaseMetadata): Promise<void> {
  const langsmith = getClient();
  if (!langsmith) return;

  const parentTrace = activeTraces.get(metadata.workflowId);
  if (!parentTrace) {
    log.warn('No active workflow trace for phase', { metadata });
    return;
  }

  try {
    const phaseTrace = await parentTrace.createChild({
      name: `Phase ${metadata.phase}: ${metadata.phaseName}`,
      run_type: 'chain',
      inputs: {
        phase: metadata.phase,
        phaseName: metadata.phaseName,
        subagentType: metadata.subagentType,
        focusArea: metadata.focusArea,
      },
    });

    await phaseTrace.postRun();
    activePhases.set(`${metadata.workflowId}:${metadata.phase}`, phaseTrace);

    if (config.debug) {
      log.debug('Started phase trace', {
        workflowId: metadata.workflowId,
        phase: metadata.phase,
        runId: phaseTrace.id,
      });
    }
  } catch (error) {
    log.error('Failed to start phase trace', { error, metadata });
  }
}

/**
 * Trace a subagent dispatch and execution
 */
export async function traceSubagent(
  metadata: SubagentMetadata,
  execute: () => Promise<SubagentResult>
): Promise<SubagentResult> {
  const langsmith = getClient();

  // Helper to execute with error handling and duration tracking
  const executeWithTracking = async (): Promise<SubagentResult> => {
    const startTime = Date.now();
    try {
      const result = await execute();
      result.durationMs = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  };

  // If tracing disabled, just execute with tracking
  if (!langsmith) {
    return executeWithTracking();
  }

  const phaseKey = `${metadata.workflowId}:${metadata.phase}`;
  const parentPhase = activePhases.get(phaseKey);

  // If no parent phase, try workflow
  const parent = parentPhase || activeTraces.get(metadata.workflowId);

  if (!parent) {
    log.warn('No active trace for subagent', { metadata });
    return executeWithTracking();
  }

  const startTime = Date.now();
  let result: SubagentResult;
  let subagentRun: RunTree | null = null;

  try {
    // Create child run for subagent
    subagentRun = await parent.createChild({
      name: `Subagent: ${metadata.focusArea}`,
      run_type: 'llm',
      inputs: {
        subagentId: metadata.subagentId,
        subagentType: metadata.subagentType,
        focusArea: metadata.focusArea,
        promptPreview: metadata.prompt.slice(0, 500) + (metadata.prompt.length > 500 ? '...' : ''),
      },
    });

    await subagentRun.postRun();

    // Execute the subagent
    result = await execute();

    // End the run with results
    await subagentRun.end({
      outputs: {
        success: result.success,
        outputPreview: result.output?.slice(0, 1000),
        tokensUsed: result.tokensUsed,
      },
    });
    await subagentRun.patchRun();

  } catch (error) {
    result = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };

    if (subagentRun) {
      await subagentRun.end({
        outputs: { error: result.error },
        error: result.error,
      });
      await subagentRun.patchRun();
    }
  }

  result.durationMs = Date.now() - startTime;

  if (config.debug) {
    log.debug('Subagent traced', {
      workflowId: metadata.workflowId,
      focusArea: metadata.focusArea,
      success: result.success,
      durationMs: result.durationMs,
    });
  }

  return result;
}

/**
 * End a phase trace
 */
export async function endPhaseTrace(
  workflowId: string,
  phase: string,
  outputs: Record<string, unknown> = {}
): Promise<void> {
  const langsmith = getClient();
  if (!langsmith) return;

  const phaseKey = `${workflowId}:${phase}`;
  const phaseTrace = activePhases.get(phaseKey);

  if (!phaseTrace) {
    log.warn('No active phase trace to end', { workflowId, phase });
    return;
  }

  try {
    await phaseTrace.end({ outputs });
    await phaseTrace.patchRun();
    activePhases.delete(phaseKey);

    if (config.debug) {
      log.debug('Ended phase trace', { workflowId, phase });
    }
  } catch (error) {
    log.error('Failed to end phase trace', { error, workflowId, phase });
  }
}

/**
 * End the workflow trace
 */
export async function endWorkflowTrace(
  workflowId: string,
  success: boolean,
  outputs: Record<string, unknown> = {}
): Promise<void> {
  const langsmith = getClient();
  if (!langsmith) return;

  const trace = activeTraces.get(workflowId);
  if (!trace) {
    log.warn('No active workflow trace to end', { workflowId });
    return;
  }

  try {
    await trace.end({
      outputs: {
        ...outputs,
        success,
        completedAt: new Date().toISOString(),
      },
      error: success ? undefined : outputs.error as string,
    });
    await trace.patchRun();
    activeTraces.delete(workflowId);

    log.info('Ended workflow trace', { workflowId, success });
  } catch (error) {
    log.error('Failed to end workflow trace', { error, workflowId });
  }
}

/**
 * Log a review iteration
 */
export async function logReviewIteration(
  workflowId: string,
  phase: string,
  iteration: number,
  reviewerType: string,
  decision: 'approved' | 'fixes_needed' | 'escalated',
  issuesFound: number
): Promise<void> {
  const langsmith = getClient();
  if (!langsmith) return;

  const phaseKey = `${workflowId}:${phase}`;
  const phaseTrace = activePhases.get(phaseKey);

  if (!phaseTrace) return;

  try {
    const reviewRun = await phaseTrace.createChild({
      name: `Review #${iteration}: ${reviewerType}`,
      run_type: 'tool',
      inputs: {
        iteration,
        reviewerType,
      },
    });

    await reviewRun.postRun();
    await reviewRun.end({
      outputs: {
        decision,
        issuesFound,
      },
    });
    await reviewRun.patchRun();

    if (config.debug) {
      log.debug('Logged review iteration', {
        workflowId,
        phase,
        iteration,
        decision,
        issuesFound,
      });
    }
  } catch (error) {
    log.error('Failed to log review iteration', { error });
  }
}

/**
 * Check if tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return config.enabled && !!config.apiKey;
}

/**
 * Get tracing configuration (for debugging)
 */
export function getTracingConfig(): typeof config {
  return { ...config, apiKey: config.apiKey ? '[REDACTED]' : undefined };
}
