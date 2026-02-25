'use client';

import { useState, useRef, useEffect, KeyboardEvent, DragEvent, ClipboardEvent } from 'react';
import { Paperclip, Shield } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { AttachmentPreview } from './AttachmentPreview';
import { CommandPalette } from './CommandPalette';
import { FileAttachment, IMAGE_EXTENSIONS } from '@/types/upload';
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
  const { pendingInputText, setPendingInputText, searchQuery, setSearchQuery, defaultMode, setDefaultMode, isStreaming, isLoadingHistory } = useChatStore();

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
    // Show palette if input starts with / and doesn't end with a space
    // (ending with space means a command was just selected)
    if (trimmed.startsWith('/') && trimmed.length > 0 && !input.endsWith(' ')) {
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
          // Check export format (e.g., "/export json", "/export markdown")
          const inputLower = trimmed.toLowerCase();
          const wantsJson = inputLower.includes('json');
          const wantsMarkdown = inputLower.includes('markdown') || inputLower.includes('md');

          if (wantsJson) {
            // Export as JSON
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
            showToast('Exported conversation as JSON', 'success');
          } else if (wantsMarkdown) {
            // Export as Markdown
            const formatTimestamp = (ts: number) => {
              return new Date(ts).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };

            const formatContent = (content: any[]): string => {
              return content.map(block => {
                if (typeof block === 'string') {
                  return block;
                }
                if (block.type === 'text') {
                  return block.text || '';
                }
                if (block.type === 'tool_use') {
                  return `\n**[Tool Use: ${block.name}]**\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\`\n`;
                }
                if (block.type === 'tool_result') {
                  const content = block.content || block.output || '';
                  return `\n**[Tool Result]**\n\`\`\`\n${content}\n\`\`\`\n`;
                }
                if (block.type === 'thinking') {
                  return `\n**[Thinking]**\n${block.thinking || ''}\n`;
                }
                if (block.type === 'image') {
                  return `\n**[Image: ${block.source?.type || 'attached'}]**\n`;
                }
                return JSON.stringify(block);
              }).join('\n');
            };

            const markdown = [
              `# Conversation Export`,
              ``,
              `**Session:** ${currentSession?.name || 'Untitled'}`,
              `**Session ID:** ${currentSession?.id || 'Unknown'}`,
              `**Exported:** ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}`,
              `**Messages:** ${messages.length}`,
              ``,
              `---`,
              ``,
              ...messages.map(msg => {
                const roleLabel = msg.role === 'user' ? '👤 User' :
                                msg.role === 'assistant' ? '🤖 Assistant' :
                                msg.role === 'system' ? '⚙️  System' : msg.role;
                return [
                  `## ${roleLabel}`,
                  `*${formatTimestamp(msg.timestamp)}*`,
                  ``,
                  formatContent(msg.content),
                  ``,
                  `---`,
                  ``
                ].join('\n');
              })
            ].join('\n');

            const blob = new Blob([markdown], {
              type: 'text/markdown'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = currentSession?.name
              ? `${currentSession.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.md`
              : `conversation-${Date.now()}.md`;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Exported conversation as Markdown', 'success');
          } else {
            // Export as HTML (default - Word-ready)
            const formatTimestamp = (ts: number) => {
              return new Date(ts).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };

            const escapeHtml = (text: string): string => {
              return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            };

            const formatContentHtml = (content: any[]): string => {
              return content.map(block => {
                if (typeof block === 'string') {
                  return `<p>${escapeHtml(block)}</p>`;
                }
                if (block.type === 'text') {
                  const text = block.text || '';
                  // Preserve line breaks
                  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
                }
                if (block.type === 'tool_use') {
                  return `
                    <div class="tool-block">
                      <strong>🔧 Tool Use: ${escapeHtml(block.name)}</strong>
                      <pre><code>${escapeHtml(JSON.stringify(block.input, null, 2))}</code></pre>
                    </div>`;
                }
                if (block.type === 'tool_result') {
                  const content = block.content || block.output || '';
                  return `
                    <div class="tool-block">
                      <strong>📤 Tool Result</strong>
                      <pre><code>${escapeHtml(String(content))}</code></pre>
                    </div>`;
                }
                if (block.type === 'thinking') {
                  return `
                    <div class="thinking-block">
                      <strong>💭 Thinking</strong>
                      <p>${escapeHtml(block.thinking || '').replace(/\n/g, '<br>')}</p>
                    </div>`;
                }
                if (block.type === 'image') {
                  return `<p><em>🖼️ Image: ${escapeHtml(block.source?.type || 'attached')}</em></p>`;
                }
                return `<pre><code>${escapeHtml(JSON.stringify(block))}</code></pre>`;
              }).join('\n');
            };

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(currentSession?.name || 'Conversation Export')}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .meta {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .meta p {
      margin: 5px 0;
      color: #6b7280;
    }
    .meta strong {
      color: #374151;
    }
    .message {
      margin: 30px 0;
      padding: 20px;
      border-left: 4px solid #e5e7eb;
      background: #fafafa;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    .message.user {
      border-left-color: #3b82f6;
      background: #eff6ff;
    }
    .message.assistant {
      border-left-color: #10b981;
      background: #f0fdf4;
    }
    .message.system {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .role {
      font-weight: 600;
      font-size: 18px;
    }
    .timestamp {
      color: #6b7280;
      font-size: 14px;
    }
    .content p {
      margin: 10px 0;
      white-space: pre-wrap;
    }
    .tool-block, .thinking-block {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .tool-block strong, .thinking-block strong {
      display: block;
      margin-bottom: 10px;
      color: #1f2937;
    }
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 10px 0;
    }
    code {
      font-family: "Monaco", "Courier New", monospace;
      font-size: 13px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .message {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>📄 Conversation Export</h1>
  <div class="meta">
    <p><strong>Session:</strong> ${escapeHtml(currentSession?.name || 'Untitled')}</p>
    <p><strong>Session ID:</strong> ${escapeHtml(currentSession?.id || 'Unknown')}</p>
    <p><strong>Exported:</strong> ${formatTimestamp(Date.now())}</p>
    <p><strong>Messages:</strong> ${messages.length}</p>
  </div>
  ${messages.map(msg => {
    const roleLabel = msg.role === 'user' ? '👤 User' :
                    msg.role === 'assistant' ? '🤖 Assistant' :
                    msg.role === 'system' ? '⚙️ System' : escapeHtml(msg.role);
    const roleClass = msg.role;
    return `
      <div class="message ${roleClass}">
        <div class="message-header">
          <div class="role">${roleLabel}</div>
          <div class="timestamp">${formatTimestamp(msg.timestamp)}</div>
        </div>
        <div class="content">
          ${formatContentHtml(msg.content)}
        </div>
      </div>`;
  }).join('\n')}
</body>
</html>`;

            const blob = new Blob([html], {
              type: 'text/html'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = currentSession?.name
              ? `${currentSession.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.html`
              : `conversation-${Date.now()}.html`;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Exported conversation as HTML', 'success');
          }
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
        showToast(error.message || 'Failed to add files', 'error');
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
        showToast(error.message || 'Failed to add files', 'error');
      }
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // Don't process paste while disabled (streaming)
    if (disabled) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Collect files from clipboard - check both items (Chrome/Firefox) and files (Safari fallback)
    const files: File[] = [];

    // Primary method: DataTransferItemList
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    // Fallback: FileList (some browsers use this instead)
    if (files.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
      files.push(...Array.from(clipboardData.files));
    }

    if (files.length === 0) return; // Let normal text paste through

    // Filter to allowed file types (match the file input accept attribute)
    // Check MIME type first, fall back to extension for empty MIME types
    const isAllowedFile = (file: File) => {
      const type = file.type;
      // Exclude SVG for security (can contain scripts)
      if (type === 'image/svg+xml') return false;
      // MIME type check
      if (type.startsWith('image/') || type.startsWith('text/') || type === 'application/pdf') {
        return true;
      }
      // Extension fallback for empty MIME types (some browsers)
      if (!type) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['txt', 'md', 'json', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'heic', 'avif'].includes(ext || '');
      }
      return false;
    };

    const validFiles = files.filter(isAllowedFile);
    const rejectedCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      // Files present but none match allowed types
      showToast('Unsupported file type. Allowed: images, text, PDF', 'error');
      e.preventDefault();
      return;
    }

    e.preventDefault();

    try {
      await addFiles(validFiles);
      // Count images using same logic as useFileUpload hook
      const imageCount = validFiles.filter(f => {
        // Check MIME type first
        if (f.type.startsWith('image/')) return true;
        // Fall back to extension for empty MIME types
        const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      }).length;

      // Build success message
      let message: string;
      if (imageCount > 0) {
        message = `${imageCount} image${imageCount > 1 ? 's' : ''} added`;
      } else {
        message = `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} added`;
      }

      // Inform user if some files were rejected
      if (rejectedCount > 0) {
        message += ` (${rejectedCount} unsupported skipped)`;
      }

      showToast(message, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to paste files', 'error');
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
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 overflow-hidden">
                {PERMISSION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => {
                      setDefaultMode(mode.value);
                      setShowModeMenu(false);
                      showToast(`Mode: ${mode.label}`, 'info');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      mode.value === defaultMode
                        ? 'bg-blue-100 dark:bg-blue-600/40 border-l-2 border-blue-500'
                        : ''
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

        <div className="flex gap-2 relative" suppressHydrationWarning>
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
            onPaste={handlePaste}
            placeholder={
              isLoadingHistory ? "Loading messages..." :
              disabled ? "Waiting for response..." :
              "Ask Claude Code... (Cmd/Ctrl+Enter to send)"
            }
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            rows={3}
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
