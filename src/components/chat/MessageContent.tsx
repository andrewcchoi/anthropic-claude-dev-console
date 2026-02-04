'use client';

import { MessageContent as MessageContentType } from '@/types/claude';
import { ToolExecution } from './ToolExecution';
import { ImageThumbnail } from './ImageThumbnail';
import { useChatStore } from '@/lib/store';

interface MessageContentProps {
  content: MessageContentType[];
}

export function MessageContent({ content }: MessageContentProps) {
  const toolExecutions = useChatStore((state) => state.toolExecutions);

  return (
    <div className="space-y-2">
      {content.map((block, index) => {
        // Skip system_info blocks - handled by SystemMessage component
        if (block.type === 'system_info') {
          return null;
        }

        if (block.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {block.text}
            </div>
          );
        } else if (block.type === 'image' && block.source) {
          return (
            <ImageThumbnail
              key={index}
              path={block.source.path}
              originalName={block.source.originalName}
            />
          );
        } else if (block.type === 'tool_use') {
          // Look up actual tool execution data from store
          const toolExecution = toolExecutions.find(t => t.id === block.id);
          const status = toolExecution?.status || 'pending';
          const output = toolExecution?.output;

          return (
            <ToolExecution
              key={block.id || index}
              name={block.name || 'unknown'}
              input={(toolExecution?.input ?? block.input ?? {}) as Record<string, unknown>}
              status={status}
              output={output as any}
            />
          );
        } else if (block.type === 'tool_result') {
          return (
            <div
              key={index}
              className="mt-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2"
            >
              <div className="text-xs font-mono opacity-70">
                Tool Result: {block.tool_use_id}
              </div>
              <pre className="mt-1 text-xs overflow-x-auto">
                {typeof block.content === 'string'
                  ? block.content
                  : JSON.stringify(block.content, null, 2)}
              </pre>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
