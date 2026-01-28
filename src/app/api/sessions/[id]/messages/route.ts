import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ChatMessage, MessageContent } from '@/types/claude';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Path to CLI session file
    const sessionPath = join(homedir(), '.claude', 'projects', '-workspace', `${id}.jsonl`);

    // Check if file exists
    try {
      await fs.access(sessionPath);
    } catch {
      // File doesn't exist - new session or deleted session
      return NextResponse.json([]);
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
    let processedCount = 0;
    let includedCount = 0;

    for (const line of lines) {
      try {
        const record: CLIMessage = JSON.parse(line);
        processedCount++;

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

    console.log(`Processed ${processedCount} lines, included ${includedCount} messages`);

    return NextResponse.json(messages, {
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
