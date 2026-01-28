'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/claude';
import { MessageContent } from './MessageContent';

interface MessageListProps {
  messages: ChatMessage[];
  isLoadingHistory?: boolean;
}

export function MessageList({ messages, isLoadingHistory }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoadingHistory && (
        <div className="flex h-full items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-2" />
            <p>Loading chat history...</p>
          </div>
        </div>
      )}
      {!isLoadingHistory && messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-500">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              Welcome to Claude Code UI
            </h2>
            <p>Start by asking a question or requesting assistance</p>
          </div>
        </div>
      )}
      {!isLoadingHistory && messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="text-xs font-semibold mb-2 uppercase opacity-70">
              {message.role}
            </div>
            <MessageContent content={message.content} />
            {message.isStreaming && (
              <span className="inline-block ml-1 animate-pulse">▊</span>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
