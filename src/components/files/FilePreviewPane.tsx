'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Copy } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { CodeViewer } from '@/components/editor/CodeViewer';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';

const log = createLogger('FilePreviewPane');

export function FilePreviewPane() {
  const { selectedFile, setPreviewOpen, trackFileActivity } = useChatStore();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBinary, setIsBinary] = useState(false);
  const [isTooLarge, setIsTooLarge] = useState(false);

  useEffect(() => {
    if (!selectedFile) return;

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setIsBinary(false);
      setIsTooLarge(false);

      try {
        // Remove /workspace prefix for API path
        const apiPath = selectedFile.replace(/^\/workspace\//, '');
        const response = await fetch(`/api/files/${encodeURIComponent(apiPath)}`);

        if (response.ok) {
          const data = await response.json();

          if (data.tooLarge) {
            setIsTooLarge(true);
            setError(data.message);
          } else if (data.content) {
            setContent(data.content);
            trackFileActivity(selectedFile, 'read');
          }
        } else {
          const data = await response.json();
          if (data.binary) {
            setIsBinary(true);
            setError('Cannot preview binary file');
          } else {
            setError(data.error || 'Failed to load file');
          }
        }
      } catch (err: any) {
        log.error('Error loading file', { selectedFile, error: err });
        setError(err.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [selectedFile, trackFileActivity]);

  const handleInsertReference = () => {
    if (!selectedFile) return;

    // Copy to clipboard with instruction
    const reference = `@${selectedFile}`;
    navigator.clipboard.writeText(reference);
    alert(`Copied "${reference}" to clipboard. Paste in chat to reference this file.`);
  };

  const handleOpenInNewTab = () => {
    if (!selectedFile) return;
    window.open(`/preview?file=${encodeURIComponent(selectedFile)}`, '_blank');
  };

  if (!selectedFile) return null;

  const fileName = selectedFile.split('/').pop() || '';

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={selectedFile}>
            {fileName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedFile}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 ml-2 flex-shrink-0"
          onClick={() => setPreviewOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={handleInsertReference}
        >
          <Copy className="w-3 h-3" />
          Insert Reference
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={handleOpenInNewTab}
        >
          <ExternalLink className="w-3 h-3" />
          Open in New Tab
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Loading...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-sm">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            {isBinary && (
              <p className="text-gray-500 dark:text-gray-400">
                Binary files cannot be previewed in the browser.
              </p>
            )}
            {isTooLarge && (
              <p className="text-gray-500 dark:text-gray-400">
                Use "Open in New Tab" or download to view.
              </p>
            )}
          </div>
        ) : (
          <CodeViewer content={content} language={getLanguageFromFilename(fileName)} />
        )}
      </div>
    </div>
  );
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sh: 'bash',
    sql: 'sql',
  };
  return languageMap[ext || ''] || 'plaintext';
}
