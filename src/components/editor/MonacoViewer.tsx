'use client';

import Editor, { loader, useMonaco } from '@monaco-editor/react';
import { useEffect, useState, useRef } from 'react';
import { editorDarkTheme, editorLightTheme } from './editorTheme';
import { useAppTheme } from '@/hooks/useAppTheme';

// Use self-hosted Monaco to avoid tracking prevention warnings
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  }
});

export type EditorTheme = 'light' | 'dark' | 'auto';

interface MonacoViewerProps {
  content: string;
  language: string;
  height?: number | string;
  showLineNumbers?: boolean;
  filePath?: string;
  showHeader?: boolean;
  theme?: EditorTheme;
}


/**
 * Monaco Editor viewer component (read-only)
 * This is the actual Monaco implementation, dynamically imported by CodeViewer
 */
export function MonacoViewer({
  content,
  language,
  height = 200,
  showLineNumbers = true,
  filePath,
  showHeader = false,
  theme = 'dark',
}: MonacoViewerProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { resolvedTheme } = useAppTheme();

  const effectiveTheme = theme === 'auto' ? (resolvedTheme || 'dark') : theme;
  const monacoThemeName = effectiveTheme === 'light' ? 'claude-light' : 'claude-dark';

  // Explicitly update Monaco theme when it changes (required for already-mounted editors)
  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(monacoThemeName);
    }
  }, [monaco, monacoThemeName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenSearch = () => {
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.focus();
      // Trigger the find action
      editor.trigger('keyboard', 'actions.find');
    }
  };

  const fileName = filePath ? filePath.split('/').pop() : 'Code';

  // Define custom themes before mounting
  const handleEditorWillMount = (monaco: any) => {
    try {
      monaco.editor.defineTheme('claude-dark', editorDarkTheme);
      monaco.editor.defineTheme('claude-light', editorLightTheme);
    } catch (error) {
      console.warn('Failed to define Monaco themes:', error);
    }
  };

  if (initError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-amber-700 dark:text-amber-200 p-4">
        <span>Editor initialization failed: {initError}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {showHeader && (
        <div className={`flex items-center justify-between px-3 py-2 border-b ${
          effectiveTheme === 'light'
            ? 'bg-gray-50 border-gray-200'
            : 'bg-gray-900 border-gray-700'
        }`}>
          <span className={`text-sm font-mono ${
            effectiveTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
          }`}>
            {fileName}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleOpenSearch}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                effectiveTheme === 'light'
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
              title="Search (Ctrl+F)"
            >
              🔍 Search
            </button>
            <button
              onClick={handleCopy}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                effectiveTheme === 'light'
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
              title="Copy to clipboard"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1">
        <Editor
          height={height}
          language={language}
          value={content}
          theme={monacoThemeName}
          beforeMount={handleEditorWillMount}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: showLineNumbers ? 'on' : 'off',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            folding: true,
            fontSize: 13,
            fontFamily: 'ui-monospace, monospace',
            padding: { top: 8, bottom: 8 },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            renderLineHighlight: 'none',
            contextmenu: false,
            links: false,
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: 'never',
              seedSearchStringFromSelection: 'never',
            },
          }}
        />
      </div>
    </div>
  );
}
