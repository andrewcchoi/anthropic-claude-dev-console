import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ChatMessage, MessageContent, ToolExecution } from '@/types/claude';

interface CLIMessage {
  type: string;
  message?: {
    role: 'user' | 'assistant';
    content: string | MessageContent[];  // Allow both string and array
  };
  uuid?: string;
  timestamp?: string;
  isMeta?: boolean;
  toolUseResult?: any;
  sourceToolAssistantUUID?: string;
}

interface SessionHistoryResponse {
  messages: ChatMessage[];
  toolExecutions: ToolExecution[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get project ID from query parameter, default to '-workspace'
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project') || '-workspace';

    // Path to CLI session file
    const sessionPath = join(homedir(), '.claude', 'projects', projectId, `${id}.jsonl`);

    // Check if file exists
    try {
      await fs.access(sessionPath);
    } catch {
      // File doesn't exist - new session or deleted session
      return NextResponse.json({ messages: [], toolExecutions: [] });
    }

    // Read and parse JSONL file
    const content = await fs.readFile(sessionPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    // Helper function to normalize content to array format
    const normalizeContent = (content: string | MessageContent[]): MessageContent[] => {
      if (typeof content === 'string') {
        return [{ type: 'text', text: content }];
      }
      return content;
    };

    const messages: ChatMessage[] = [];
    const toolExecutions: ToolExecution[] = [];
    const toolExecutionMap = new Map<string, Partial<ToolExecution>>();
    let processedCount = 0;
    let includedCount = 0;

    for (const line of lines) {
      try {
        const record: CLIMessage = JSON.parse(line);
        processedCount++;

        // Track tool_use blocks from assistant messages
        if (record.type === 'assistant' && record.message?.content) {
          const normalizedContent = normalizeContent(record.message.content);
          for (const block of normalizedContent) {
            if (block.type === 'tool_use' && block.id && block.name) {
              toolExecutionMap.set(block.id, {
                id: block.id,
                name: block.name,
                input: (block.input || {}) as Record<string, unknown>,
                status: 'pending',
                timestamp: record.timestamp ? new Date(record.timestamp).getTime() : Date.now(),
              });
            }
          }
        }

        // Track tool results from user messages
        if (record.type === 'user' && record.toolUseResult && record.sourceToolAssistantUUID) {
          // Find the tool_use_id from the message content
          const normalizedContent = normalizeContent(record.message?.content || []);
          const toolResultBlock = normalizedContent.find(
            (c: any) => c.type === 'tool_result' && c.tool_use_id
          );

          if (toolResultBlock && toolResultBlock.tool_use_id) {
            const toolId = toolResultBlock.tool_use_id;
            const existing = toolExecutionMap.get(toolId);

            if (existing) {
              // Determine status based on result
              const isError = toolResultBlock.is_error ||
                            (typeof record.toolUseResult === 'string' && record.toolUseResult.startsWith('Error:'));

              toolExecutionMap.set(toolId, {
                ...existing,
                output: record.toolUseResult,
                status: isError ? 'error' : 'success',
              });
            }
          }
        }

        // Only include user and assistant messages
        // Exclude tool results (identified by toolUseResult field or tool_result content)
        // Exclude meta messages (like command invocations)
        if ((record.type === 'user' || record.type === 'assistant') &&
            record.message &&
            !record.isMeta &&
            !record.toolUseResult) {

          // Normalize content to array format for checking
          const normalizedContent = normalizeContent(record.message.content);

          // Check if this is a tool_result in the content
          const hasToolResult = normalizedContent.some(
            (c: any) => c.type === 'tool_result' || c.tool_use_id
          );

          // Filter out internal messages (commands, meta)
          const isInternalMessage = typeof record.message.content === 'string' &&
            (record.message.content.includes('<local-command-') ||
             record.message.content.includes('<command-name>'));

          if (!hasToolResult && !isInternalMessage) {
            const message: ChatMessage = {
              id: record.uuid || `${Date.now()}-${Math.random()}`,
              role: record.message.role,
              content: normalizedContent,
              timestamp: record.timestamp ? new Date(record.timestamp).getTime() : Date.now(),
            };
            messages.push(message);
            includedCount++;
          }
        }
      } catch (parseError) {
        // Skip malformed lines
        console.error('Failed to parse line:', parseError);
      }
    }

    // Convert tool execution map to array
    for (const [_, toolExec] of toolExecutionMap) {
      if (toolExec.id && toolExec.name && toolExec.input && toolExec.status && toolExec.timestamp !== undefined) {
        toolExecutions.push(toolExec as ToolExecution);
      }
    }

    console.log(`Processed ${processedCount} lines, included ${includedCount} messages, ${toolExecutions.length} tool executions`);

    const response: SessionHistoryResponse = {
      messages,
      toolExecutions,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error reading session messages:', error);
    return NextResponse.json(
      { error: 'Failed to load session messages', details: String(error) },
      { status: 500 }
    );
  }
}
