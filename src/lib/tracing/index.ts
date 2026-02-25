/**
 * Tracing module for ultrathink-v2 observability
 *
 * Provides integration with LangSmith for:
 * - Workflow tracing
 * - Phase tracking
 * - Subagent monitoring
 * - Review iteration logging
 */

export {
  startWorkflowTrace,
  startPhaseTrace,
  traceSubagent,
  endPhaseTrace,
  endWorkflowTrace,
  logReviewIteration,
  isTracingEnabled,
  getTracingConfig,
  type WorkflowMetadata,
  type PhaseMetadata,
  type SubagentMetadata,
  type SubagentResult,
} from './langsmith';
