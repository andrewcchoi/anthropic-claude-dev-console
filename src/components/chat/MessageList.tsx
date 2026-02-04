'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/claude';
import { MessageContent } from './MessageContent';
import { SystemMessage } from './SystemMessage';
import { useChatStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  isLoadingHistory?: boolean;
}

export function MessageList({ messages, isLoadingHistory }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isPrewarming, prewarmError } = useChatStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoadingHistory && (
        <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-2" />
            <p>Loading chat history...</p>
          </div>
        </div>
      )}

      {/* Prewarm placeholder */}
      {isPrewarming && messages.length === 0 && !isLoadingHistory && (
        <div className="flex justify-center">
          <div className="max-w-2xl w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-gray-600 dark:text-gray-300">Initializing session...</span>
            </div>
          </div>
        </div>
      )}

      {/* Prewarm error */}
      {prewarmError && messages.length === 0 && (
        <div className="flex justify-center">
          <div className="max-w-2xl w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="text-red-600 dark:text-red-400">
              Failed to initialize: {prewarmError}
            </div>
          </div>
        </div>
      )}
      {!isLoadingHistory && messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Welcome to Claude Code UI
            </h2>
            <p>Start by asking a question or requesting assistance</p>
          </div>
        </div>
      )}
      {!isLoadingHistory && messages.map((message) => {
        // Handle system messages differently
        if (message.role === 'system') {
          return <SystemMessage key={message.id} message={message} />;
        }

        return (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
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
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
