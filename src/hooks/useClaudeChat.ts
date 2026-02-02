import { useState, useCallback } from 'react';
import { useChatStore } from '@/lib/store';
import { ChatMessage, MessageContent, SDKMessage } from '@/types/claude';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClaudeChat');

export function useClaudeChat() {
  const {
    messages,
    addMessage,
    updateMessage,
    sessionId,
    setSessionId,
    isStreaming,
    setIsStreaming,
    setError,
    addToolExecution,
    updateToolExecution,
    updateUsage,
    saveCurrentSession,
  } = useChatStore();

  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (prompt: string, cwd?: string) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text: prompt }],
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: [],
        timestamp: Date.now(),
        isStreaming: true,
      };
      addMessage(assistantMessage);
      setCurrentMessageId(assistantMessageId);
      setIsStreaming(true);
      setError(null);

      try {
        // Get fresh sessionId from store to avoid stale closure
        const currentSessionId = useChatStore.getState().sessionId;
        log.debug('Sending message', {
          sessionId: currentSessionId,
          contentLength: prompt.length
        });

        log.debug('Starting stream', { endpoint: '/api/claude' });
        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, sessionId: currentSessionId, cwd }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let currentContent: MessageContent[] = [];
        let currentTextBlock: MessageContent | null = null;
        let toolInputBuffers: Record<number, string> = {}; // Track partial JSON per tool index
        let toolIndexToId: Record<number, string> = {}; // Map event.index to tool ID
        let receivedSuccessResult = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const message: SDKMessage = JSON.parse(line.slice(6));
                log.debug('Received chunk', { type: message.type });

                // Handle different message types from Claude CLI
                if (message.type === 'system') {
                  // Store session ID
                  if (message.session_id) {
                    setSessionId(message.session_id);
                    setTimeout(() => saveCurrentSession(), 100);
                  }
                } else if (message.type === 'assistant') {
                  // Full assistant message (comes at end of stream)
                  if (message.message?.content) {
                    // Process tool_use blocks FIRST - create tool executions
                    for (const block of message.message.content) {
                      if (block.type === 'tool_use' && block.id) {
                        // Check if tool execution already exists
                        const existingTool = useChatStore.getState().toolExecutions.find(t => t.id === block.id);
                        if (!existingTool) {
                          addToolExecution({
                            id: block.id,
                            name: block.name || 'unknown',
                            input: block.input || {},
                            status: 'pending',
                            timestamp: Date.now(),
                          });
                        } else {
                          // Update input if we now have it
                          if (block.input && Object.keys(block.input).length > 0) {
                            updateToolExecution(block.id, { input: block.input });
                          }
                        }
                      }
                    }

                    // Preserve existing tool_use blocks from streaming
                    const existingToolUseBlocks = currentContent.filter(c => c.type === 'tool_use');

                    // Map incoming content (typically just text blocks)
                    const incomingContent = message.message.content.map((block: any) => ({
                      type: block.type,
                      text: block.text,
                      id: block.id,
                      name: block.name,
                      input: block.input,
                    }));

                    // Get tool_use blocks from incoming message
                    const incomingToolUseBlocks = incomingContent.filter(c => c.type === 'tool_use');
                    const incomingNonToolUse = incomingContent.filter(c => c.type !== 'tool_use');

                    // Merge tool_use blocks: deduplicate by ID, prefer incoming data
                    const toolUseById = new Map<string, any>();
                    for (const block of existingToolUseBlocks) {
                      if (block.id) toolUseById.set(block.id, block);
                    }
                    for (const block of incomingToolUseBlocks) {
                      if (block.id) toolUseById.set(block.id, block);
                    }
                    const mergedToolUseBlocks = Array.from(toolUseById.values());

                    currentContent = [...mergedToolUseBlocks, ...incomingNonToolUse];

                    updateMessage(assistantMessageId, {
                      content: currentContent,
                    });
                  }
                } else if (message.type === 'user') {
                  // User messages can contain tool_result blocks (tool outputs)
                  if (message.message?.content) {
                    for (const block of message.message.content) {
                      if (block.type === 'tool_result' && block.tool_use_id) {
                        updateToolExecution(block.tool_use_id, {
                          output: block.content,
                          status: block.is_error ? 'error' : 'success',
                        });
                      }
                    }
                  }
                } else if (message.type === 'stream_event') {
                  const event = message.event;

                  if (event?.type === 'content_block_delta') {
                    // Handle streaming text deltas
                    if (event.delta?.type === 'text_delta') {
                      if (!currentTextBlock) {
                        currentTextBlock = { type: 'text', text: event.delta.text };
                        currentContent = [...currentContent, currentTextBlock];
                      } else {
                        currentTextBlock.text =
                          (currentTextBlock.text || '') + event.delta.text;
                      }
                      updateMessage(assistantMessageId, {
                        content: [...currentContent],
                      });
                    } else if (event.delta?.type === 'input_json_delta') {
                      // Accumulate tool input JSON
                      const index = event.index;
                      if (index === undefined) continue;

                      if (toolInputBuffers[index] === undefined) {
                        toolInputBuffers[index] = '';
                      }
                      toolInputBuffers[index] += event.delta.partial_json || '';

                      // Try to parse and update the tool execution
                      try {
                        const parsedInput = JSON.parse(toolInputBuffers[index]);
                        // Use ID-based lookup instead of index
                        const toolId = toolIndexToId[index];
                        if (toolId) {
                          updateToolExecution(toolId, { input: parsedInput });
                        }
                      } catch {
                        // JSON not complete yet, continue accumulating
                      }
                    }
                  } else if (event?.type === 'content_block_start') {
                    // New content block starting
                    if (event.content_block?.type === 'tool_use') {
                      const toolBlock = event.content_block;
                      const toolId = toolBlock.id || `tool-${Date.now()}`;

                      // Track which tool is at this index
                      if (event.index !== undefined) {
                        toolIndexToId[event.index] = toolId;
                      }

                      addToolExecution({
                        id: toolId,
                        name: toolBlock.name || 'unknown',
                        input: toolBlock.input,
                        status: 'pending',
                        timestamp: Date.now(),
                      });
                      currentContent = [...currentContent, {
                        type: 'tool_use',
                        id: toolId,
                        name: toolBlock.name,
                        input: toolBlock.input,
                      }];
                      currentTextBlock = null;
                    } else if (event.content_block?.type === 'text') {
                      // Reset for new text block
                      currentTextBlock = null;
                    }
                  }
                } else if (message.type === 'result') {
                  // Final result
                  if (message.subtype === 'success') {
                    receivedSuccessResult = true;
                    // Extract and update usage stats
                    if (message.total_cost_usd !== undefined || message.usage) {
                      updateUsage({
                        totalCost: message.total_cost_usd || 0,
                        inputTokens: message.usage?.input_tokens || 0,
                        outputTokens: message.usage?.output_tokens || 0,
                        durationMs: message.duration_ms || 0,
                        requestCount: 1,
                      });
                    }
                  } else if (message.subtype === 'error' || message.is_error) {
                    setError(message.error || 'Unknown error');
                  }
                } else if (message.type === 'session_locked') {
                  // Session ID conflict - generate new session and retry
                  const newSessionId = uuidv4();
                  setSessionId(newSessionId);
                  setError('Session conflict detected, regenerating session...');
                } else if (message.type === 'error') {
                  // Only show errors if we haven't received a successful result
                  if (!receivedSuccessResult) {
                    setError(message.error || 'Unknown error');
                  }
                }
              } catch (e) {
                log.error('Failed to parse SSE message', { error: e });
              }
            }
          }
        }

        // Mark streaming as complete
        updateMessage(assistantMessageId, { isStreaming: false });
        setIsStreaming(false);
        setCurrentMessageId(null);

        log.debug('Stream completed', {
          messageCount: useChatStore.getState().messages.length
        });
      } catch (error: any) {
        setError(error.message || 'Failed to send message');
        setIsStreaming(false);
        updateMessage(assistantMessageId, { isStreaming: false });
        setCurrentMessageId(null);
      }
    },
    [
      addMessage,
      updateMessage,
      setSessionId,
      setIsStreaming,
      setError,
      addToolExecution,
      updateToolExecution,
      updateUsage,
      saveCurrentSession,
    ]
  );

  return {
    messages,
    sendMessage,
    isStreaming,
  };
}
