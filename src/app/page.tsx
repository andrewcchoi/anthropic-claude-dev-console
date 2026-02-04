'use client';

import { useClaudeChat } from '@/hooks/useClaudeChat';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { RightPanel } from '@/components/sidebar/RightPanel';
import { UsageDisplay } from '@/components/usage/UsageDisplay';
import { FilePreviewPane } from '@/components/files/FilePreviewPane';
import { HelpPanel } from '@/components/panels/HelpPanel';
import { StatusPanel } from '@/components/panels/StatusPanel';
import { useChatStore } from '@/lib/store';

export default function Home() {
  const { messages, sendMessage, isStreaming } = useClaudeChat();
  const { error, sidebarOpen, isLoadingHistory, previewOpen } = useChatStore();

  const handleSend = (message: string, attachments?: any) => {
    sendMessage(message, undefined, attachments);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar />
      <HelpPanel />
      <StatusPanel />
      {previewOpen ? (
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <FilePreviewPane />
          </div>
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
      ) : (
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
      )}
      <RightPanel />
    </div>
  );
}
