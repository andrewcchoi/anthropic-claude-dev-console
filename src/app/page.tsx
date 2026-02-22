'use client';

import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import { useCliPrewarm } from '@/hooks/useCliPrewarm';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { RightPanel } from '@/components/sidebar/RightPanel';
import { UsageDisplay } from '@/components/usage/UsageDisplay';
import { FilePreviewPane } from '@/components/files/FilePreviewPane';
import { HelpPanel } from '@/components/panels/HelpPanel';
import { StatusPanel } from '@/components/panels/StatusPanel';
import { ModelPanel } from '@/components/panels/ModelPanel';
import { TodosPanel } from '@/components/panels/TodosPanel';
import { RenameDialog } from '@/components/panels/RenameDialog';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useChatStore } from '@/lib/store';
import { createLogger } from '@/lib/logger';

const log = createLogger('Home');

export default function Home() {
  const { messages, sendMessage, isStreaming } = useClaudeChat();
  const { error, sidebarOpen, isLoadingHistory, previewOpen, rightPanelOpen, sessionId, availableSkills, availableCommands } = useChatStore();
  const { prewarmCli } = useCliPrewarm();
  const hasInitialized = useRef(false);

  // Initialize CLI on mount to load skills and commands
  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) {
      return;
    }

    // Skip if skills and commands are already loaded
    if (availableSkills?.length > 0 || availableCommands?.length > 0) {
      log.debug('Skills/commands already loaded, skipping initialization', {
        skillsCount: availableSkills?.length,
        commandsCount: availableCommands?.length,
      });
      hasInitialized.current = true;
      return;
    }

    // Initialize CLI to get skills and commands
    // Use current session if available, otherwise create a temporary session with valid UUID
    const initSessionId = sessionId || uuidv4();

    log.debug('Initializing CLI to load skills and commands', {
      sessionId: initSessionId,
      isTemporary: !sessionId,
    });

    hasInitialized.current = true;
    prewarmCli(initSessionId);
  }, [sessionId, availableSkills, availableCommands, prewarmCli]);

  const handleSend = (message: string, attachments?: any) => {
    sendMessage(message, undefined, attachments);
  };

  return (
    <div className="flex min-w-0 h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar />
      <HelpPanel />
      <StatusPanel />
      <ModelPanel />
      <TodosPanel />
      <RenameDialog />
      <ToastContainer />
      {previewOpen ? (
        <div className={`flex-1 flex min-w-0 isolate transition-[margin] duration-300 ease-in-out will-change-[margin] ${sidebarOpen ? '' : 'ml-10'} ${rightPanelOpen ? 'mr-64' : 'mr-10'}`}>
          <div className="flex-1 flex flex-col min-w-0">
            <FilePreviewPane />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
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
        <div className={`flex-1 flex flex-col min-w-0 isolate transition-[margin] duration-300 ease-in-out will-change-[margin] ${sidebarOpen ? '' : 'ml-10'} ${rightPanelOpen ? 'mr-64' : 'mr-10'}`}>
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
