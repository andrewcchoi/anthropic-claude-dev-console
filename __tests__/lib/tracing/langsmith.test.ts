/**
 * Tests for LangSmith tracing integration
 *
 * These tests verify configuration and basic functionality.
 * Full integration tests require a valid LangSmith API key.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('LangSmith Tracing Configuration', () => {
  beforeEach(() => {
    // Reset modules to pick up new env vars
    vi.resetModules();
    // Clear all env vars
    delete process.env.CC_LANGSMITH_API_KEY;
    delete process.env.CC_LANGSMITH_PROJECT;
    delete process.env.TRACE_TO_LANGSMITH;
    delete process.env.CC_LANGSMITH_DEBUG;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('Environment Variables', () => {
    it('should read CC_ prefixed environment variables', async () => {
      process.env.CC_LANGSMITH_API_KEY = 'test-api-key';
      process.env.CC_LANGSMITH_PROJECT = 'test-project';
      process.env.TRACE_TO_LANGSMITH = 'true';
      process.env.CC_LANGSMITH_DEBUG = 'true';

      const { getTracingConfig } = await import('@/lib/tracing/langsmith');
      const config = getTracingConfig();

      expect(config.project).toBe('test-project');
      expect(config.debug).toBe(true);
      expect(config.enabled).toBe(true);
      expect(config.apiKey).toBe('[REDACTED]'); // Should be redacted
    });

    it('should use default project name when not specified', async () => {
      process.env.CC_LANGSMITH_API_KEY = 'test-key';
      process.env.TRACE_TO_LANGSMITH = 'true';

      const { getTracingConfig } = await import('@/lib/tracing/langsmith');
      const config = getTracingConfig();

      expect(config.project).toBe('ultrathink-v2');
    });

    it('should report apiKey as undefined when not set', async () => {
      process.env.TRACE_TO_LANGSMITH = 'true';

      const { getTracingConfig } = await import('@/lib/tracing/langsmith');
      const config = getTracingConfig();

      expect(config.apiKey).toBeUndefined();
    });
  });

  describe('Tracing Enabled Check', () => {
    it('should report tracing disabled when no API key', async () => {
      process.env.TRACE_TO_LANGSMITH = 'true';
      delete process.env.CC_LANGSMITH_API_KEY;

      const { isTracingEnabled } = await import('@/lib/tracing/langsmith');

      expect(isTracingEnabled()).toBe(false);
    });

    it('should report tracing disabled when TRACE_TO_LANGSMITH is false', async () => {
      process.env.CC_LANGSMITH_API_KEY = 'test-key';
      process.env.TRACE_TO_LANGSMITH = 'false';

      const { isTracingEnabled } = await import('@/lib/tracing/langsmith');

      expect(isTracingEnabled()).toBe(false);
    });

    it('should report tracing disabled when TRACE_TO_LANGSMITH is not set', async () => {
      process.env.CC_LANGSMITH_API_KEY = 'test-key';

      const { isTracingEnabled } = await import('@/lib/tracing/langsmith');

      expect(isTracingEnabled()).toBe(false);
    });

    it('should report tracing enabled when both API key and flag are set', async () => {
      process.env.CC_LANGSMITH_API_KEY = 'test-key';
      process.env.TRACE_TO_LANGSMITH = 'true';

      const { isTracingEnabled } = await import('@/lib/tracing/langsmith');

      expect(isTracingEnabled()).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    it('should not throw when starting workflow trace with tracing disabled', async () => {
      process.env.TRACE_TO_LANGSMITH = 'false';

      const { startWorkflowTrace } = await import('@/lib/tracing/langsmith');

      // Should not throw
      await expect(startWorkflowTrace({
        workflowId: 'test-1',
        taskDescription: 'Test task',
        startedAt: new Date(),
      })).resolves.toBeUndefined();
    });

    it('should not throw when ending workflow trace with tracing disabled', async () => {
      process.env.TRACE_TO_LANGSMITH = 'false';

      const { endWorkflowTrace } = await import('@/lib/tracing/langsmith');

      // Should not throw
      await expect(endWorkflowTrace('non-existent', false)).resolves.toBeUndefined();
    });

    it('should execute function even when tracing disabled', async () => {
      process.env.TRACE_TO_LANGSMITH = 'false';

      const { traceSubagent } = await import('@/lib/tracing/langsmith');

      let executed = false;
      const result = await traceSubagent(
        {
          workflowId: 'test-2',
          phase: '1',
          subagentId: 'sub-1',
          subagentType: 'general-purpose',
          focusArea: 'Testing',
          prompt: 'Test prompt',
        },
        async () => {
          executed = true;
          return { success: true, output: 'Done' };
        }
      );

      expect(executed).toBe(true);
      expect(result.success).toBe(true);
      expect(result.output).toBe('Done');
    });

    it('should capture errors from subagent execution', async () => {
      process.env.TRACE_TO_LANGSMITH = 'false';

      const { traceSubagent } = await import('@/lib/tracing/langsmith');

      const result = await traceSubagent(
        {
          workflowId: 'test-3',
          phase: '1',
          subagentId: 'sub-2',
          subagentType: 'general-purpose',
          focusArea: 'Testing',
          prompt: 'Test prompt',
        },
        async () => {
          throw new Error('Test error');
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should track duration even when tracing disabled', async () => {
      process.env.TRACE_TO_LANGSMITH = 'false';

      const { traceSubagent } = await import('@/lib/tracing/langsmith');

      const result = await traceSubagent(
        {
          workflowId: 'test-4',
          phase: '1',
          subagentId: 'sub-3',
          subagentType: 'general-purpose',
          focusArea: 'Testing',
          prompt: 'Test prompt',
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { success: true };
        }
      );

      expect(result.durationMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Type Definitions', () => {
    it('should export all required types', async () => {
      const tracing = await import('@/lib/tracing/langsmith');

      // Verify functions are exported
      expect(typeof tracing.startWorkflowTrace).toBe('function');
      expect(typeof tracing.startPhaseTrace).toBe('function');
      expect(typeof tracing.traceSubagent).toBe('function');
      expect(typeof tracing.endPhaseTrace).toBe('function');
      expect(typeof tracing.endWorkflowTrace).toBe('function');
      expect(typeof tracing.logReviewIteration).toBe('function');
      expect(typeof tracing.isTracingEnabled).toBe('function');
      expect(typeof tracing.getTracingConfig).toBe('function');
    });
  });
});
