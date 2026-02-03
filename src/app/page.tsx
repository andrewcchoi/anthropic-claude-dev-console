'use client';

import { useClaudeChat } from '@/hooks/useClaudeChat';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { UsageDisplay } from '@/components/usage/UsageDisplay';
import { useChatStore } from '@/lib/store';

export default function Home() {
  const { messages, sendMessage, isStreaming } = useClaudeChat();
  const { error, sidebarOpen, isLoadingHistory } = useChatStore();

  const handleSend = (message: string, attachments?: any) => {
    sendMessage(message, undefined, attachments);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-red-600 text-white px-4 py-3 text-sm">
            Error: {error}
          </div>
        )}
        <MessageList messages={messages} isLoadingHistory={isLoadingHistory} />
        <UsageDisplay />
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
