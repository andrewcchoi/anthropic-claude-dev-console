'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CodeViewer } from '@/components/editor/CodeViewer';
import { Button } from '@/components/ui/button';
import { Copy, ArrowLeft } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('PreviewPage');

function PreviewContent() {
  const searchParams = useSearchParams();
  const filePath = searchParams.get('file');

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setError('No file specified');
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);

      try {
        // Remove /workspace prefix for API path
        const apiPath = filePath.replace(/^\/workspace\//, '');
        const response = await fetch(`/api/files/${encodeURIComponent(apiPath)}`);

        if (response.ok) {
          const data = await response.json();

          if (data.tooLarge) {
            setError(data.message);
          } else if (data.content) {
            setContent(data.content);
          }
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to load file');
        }
      } catch (err: any) {
        log.error('Error loading file', { filePath, error: err });
        setError(err.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  const handleInsertReference = () => {
    if (!filePath) return;
    const reference = `@${filePath}`;
    navigator.clipboard.writeText(reference);
    alert(`Copied "${reference}" to clipboard!`);
  };

  const fileName = filePath?.split('/').pop() || '';

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.close()}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Close
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title={filePath || ''}>
              {fileName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{filePath}</p>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleInsertReference}
          className="flex items-center gap-1 flex-shrink-0"
        >
          <Copy className="w-3 h-3" />
          Insert Reference
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Loading...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <p className="text-red-600 dark:text-red-400 text-lg mb-2">{error}</p>
          </div>
        ) : (
          <CodeViewer content={content} language={getLanguageFromFilename(fileName)} />
        )}
      </div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <PreviewContent />
    </Suspense>
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
