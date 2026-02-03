'use client';

import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from 'react';
import { Paperclip } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { AttachmentPreview } from './AttachmentPreview';
import { FileAttachment } from '@/types/upload';
import { useChatStore } from '@/lib/store';

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attachments, addFiles, removeAttachment, clearAttachments } = useFileUpload();
  const { pendingInputText, setPendingInputText, searchQuery, setSearchQuery } = useChatStore();

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

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
      setInput('');
      clearAttachments();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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

        {/* Attachment preview */}
        <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

        <div className="flex gap-2">
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
