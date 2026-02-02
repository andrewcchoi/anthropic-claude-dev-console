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
                    currentContent = message.message.content.map((block: any) => ({
                      type: block.type,
                      text: block.text,
                      id: block.id,
                      name: block.name,
                      input: block.input,
                    }));
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
                    }
                  } else if (event?.type === 'content_block_start') {
                    // New content block starting
                    if (event.content_block?.type === 'tool_use') {
                      const toolBlock = event.content_block;
                      addToolExecution({
                        id: toolBlock.id || `tool-${Date.now()}`,
                        name: toolBlock.name || 'unknown',
                        input: toolBlock.input,
                        status: 'pending',
                        timestamp: Date.now(),
                      });
                      currentContent = [...currentContent, {
                        type: 'tool_use',
                        id: toolBlock.id,
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
