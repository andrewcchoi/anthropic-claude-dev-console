'use client';

import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from 'react';
import { Paperclip, Shield } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { AttachmentPreview } from './AttachmentPreview';
import { CommandPalette } from './CommandPalette';
import { FileAttachment } from '@/types/upload';
import { useChatStore } from '@/lib/store';
import { routeCommand } from '@/lib/commands/router';
import { showToast } from '@/lib/utils/toast';
import { cycleTheme, getThemeDisplayName } from '@/lib/utils/theme';
import { DefaultMode } from '@/types/claude';

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  disabled?: boolean;
}

const PERMISSION_MODES: { value: DefaultMode; label: string; color: string }[] = [
  { value: 'default', label: 'Default', color: 'bg-green-500' },
  { value: 'plan', label: 'Plan', color: 'bg-blue-500' },
  { value: 'acceptEdits', label: 'Accept Edits', color: 'bg-yellow-500' },
  { value: 'dontAsk', label: "Don't Ask", color: 'bg-orange-500' },
  { value: 'bypassPermissions', label: 'Bypass', color: 'bg-red-500' },
];

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const { attachments, addFiles, removeAttachment, clearAttachments } = useFileUpload();
  const { pendingInputText, setPendingInputText, searchQuery, setSearchQuery, defaultMode, setDefaultMode, isStreaming } = useChatStore();

  // Handle pending input text from file reference insertion
  useEffect(() => {
    if (pendingInputText) {
      setInput((prev) => {
        const newValue = prev ? `${prev} ${pendingInputText}` : pendingInputText;
        return newValue;
      });
      setPendingInputText(null);
      // Focus the textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [pendingInputText, setPendingInputText]);

  // Handle search query from code selection
  useEffect(() => {
    if (searchQuery) {
      const searchMessage = `Search the codebase for: \`${searchQuery}\``;
      setSearchQuery(null);
      // Auto-send the search query
      onSend(searchMessage);
    }
  }, [searchQuery, setSearchQuery, onSend]);

  // Close mode menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    };
    if (showModeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeMenu]);

  const currentModeInfo = PERMISSION_MODES.find(m => m.value === defaultMode) || PERMISSION_MODES[0];

  const cycleMode = () => {
    const currentIndex = PERMISSION_MODES.findIndex(m => m.value === defaultMode);
    const nextIndex = (currentIndex + 1) % PERMISSION_MODES.length;
    setDefaultMode(PERMISSION_MODES[nextIndex].value);
    showToast(`Mode: ${PERMISSION_MODES[nextIndex].label}`, 'info');
  };

  // Show/hide command palette based on input
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.startsWith('/') && trimmed.length > 0) {
      setShowCommandPalette(true);
    } else {
      setShowCommandPalette(false);
    }
  }, [input]);

  const handleCommandSelect = (command: string) => {
    setInput(command + ' ');
    setShowCommandPalette(false);
    // Focus textarea after selection
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    // Route the command
    const route = routeCommand(trimmed);

    if (route.type === 'local') {
      // Handle built-in commands locally
      const {
        clearChat,
        setHelpPanelOpen,
        setStatusPanelOpen,
        setModelPanelOpen,
        setTodosPanelOpen,
        setRenameDialogOpen,
        messages,
        currentSession,
      } = useChatStore.getState();

      switch (route.handler) {
        case 'openHelpPanel':
          setHelpPanelOpen(true);
          break;
        case 'clearChat':
          clearChat();
          break;
        case 'openStatusPanel':
          setStatusPanelOpen(true);
          break;
        case 'scrollToUsage':
          // Find and scroll to usage display
          const usageElement = document.querySelector('[data-usage-display]');
          usageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        case 'copyLastResponse': {
          // Find last assistant message
          const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) {
            const text = lastAssistant.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join('\n');
            navigator.clipboard.writeText(text).then(() => {
              showToast('Copied to clipboard', 'success');
            }).catch(() => {
              showToast('Failed to copy', 'error');
            });
          } else {
            showToast('No assistant response to copy', 'info');
          }
          break;
        }
        case 'cycleTheme': {
          const newTheme = cycleTheme();
          showToast(`Theme: ${getThemeDisplayName(newTheme)}`, 'info');
          break;
        }
        case 'openModelPanel':
          setModelPanelOpen(true);
          break;
        case 'exportConversation': {
          // Export messages as JSON
          const exportData = {
            sessionId: currentSession?.id,
            sessionName: currentSession?.name,
            exportedAt: new Date().toISOString(),
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp
            }))
          };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const filename = currentSession?.name
            ? `${currentSession.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`
            : `conversation-${Date.now()}.json`;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Exported conversation', 'success');
          break;
        }
        case 'openTodosPanel':
          setTodosPanelOpen(true);
          break;
        case 'openRenameDialog':
          if (!currentSession) {
            showToast('No active session to rename', 'info');
          } else {
            setRenameDialogOpen(true);
          }
          break;
        case 'openContextPanel':
        case 'openConfigPanel':
          // Future: implement these panels
          // For now, pass through to CLI
          onSend(trimmed, attachments.length > 0 ? attachments : undefined);
          break;
      }
      setInput('');
      clearAttachments();
      return;
    }

    // Pass through to CLI (skill commands, plugins, regular messages)
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setInput('');
    clearAttachments();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // If command palette is open, let it handle arrow keys and enter
    if (showCommandPalette && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      // Don't prevent default for Escape - let CommandPalette handle it
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
      return;
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        await addFiles(e.target.files);
      } catch (error: any) {
        alert(error.message || 'Failed to add files');
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      try {
        await addFiles(e.dataTransfer.files);
      } catch (error: any) {
        alert(error.message || 'Failed to add files');
      }
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-sm">
            <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
              Drop files here
            </p>
          </div>
        )}

        {/* Permission mode indicator */}
        <div className="mb-2 flex items-center gap-2">
          <div className="relative" ref={modeMenuRef}>
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              onDoubleClick={cycleMode}
              disabled={isStreaming}
              className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all disabled:opacity-50 text-xs"
              title="Click to select mode, double-click to cycle"
            >
              <Shield className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              <div className={`w-2 h-2 rounded-full ${currentModeInfo.color}`} />
              <span className="text-gray-700 dark:text-gray-300 font-medium">{currentModeInfo.label}</span>
            </button>

            {/* Mode dropdown menu */}
            {showModeMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                {PERMISSION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => {
                      setDefaultMode(mode.value);
                      setShowModeMenu(false);
                      showToast(`Mode: ${mode.label}`, 'info');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      mode.value === defaultMode ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${mode.color}`} />
                    <span className="text-gray-900 dark:text-gray-100">{mode.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attachment preview */}
        <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

        <div className="flex gap-2 relative">
          {/* Command palette */}
          {showCommandPalette && (
            <CommandPalette
              inputValue={input}
              onSelectCommand={handleCommandSelect}
              onClose={() => setShowCommandPalette(false)}
            />
          )}
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,text/*,application/pdf,.txt,.md,.json,.csv"
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            title="Attach files"
          >
            <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude Code... (Cmd/Ctrl+Enter to send)"
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            rows={3}
            disabled={disabled}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Cmd/Ctrl+Enter to send
        </p>
      </div>
    </div>
  );
}
