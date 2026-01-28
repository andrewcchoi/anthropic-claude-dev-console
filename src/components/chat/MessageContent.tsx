'use client';

import { MessageContent as MessageContentType } from '@/types/claude';
import { ToolExecution } from './ToolExecution';

interface MessageContentProps {
  content: MessageContentType[];
}

export function MessageContent({ content }: MessageContentProps) {
  return (
    <div className="space-y-2">
      {content.map((block, index) => {
        if (block.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {block.text}
            </div>
          );
        } else if (block.type === 'tool_use') {
          return (
            <ToolExecution
              key={block.id || index}
              name={block.name || 'unknown'}
              input={block.input}
              status="pending"
            />
          );
        } else if (block.type === 'tool_result') {
          return (
            <div
              key={index}
              className="mt-2 rounded border border-gray-300 bg-gray-50 p-2"
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
