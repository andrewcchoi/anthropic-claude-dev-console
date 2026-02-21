'use client';

import { DiffEditor, loader, useMonaco } from '@monaco-editor/react';
import { useEffect, useState, useRef } from 'react';
import { editorDarkTheme, editorLightTheme } from './editorTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { detectLanguage } from '@/lib/utils/languageDetection';

// Use self-hosted Monaco to avoid tracking prevention warnings
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  }
});

export type EditorTheme = 'light' | 'dark' | 'auto';

interface DiffViewerProps {
  /** Original content (left side) */
  original: string;
  /** Modified content (right side) */
  modified: string;
  /** File path for language detection */
  filePath?: string;
  /** Explicit language ID (overrides detection) */
  language?: string;
  /** Height in pixels or CSS value */
  height?: number | string;
  /** Theme selection: 'light', 'dark', or 'auto' (default: 'auto') */
  theme?: EditorTheme;
  /** Show header with file path (default: true) */
  showHeader?: boolean;
}

/**
 * Monaco DiffEditor component for side-by-side diff viewing
 * Shows old_string vs new_string for Edit tool
 * Read-only, side-by-side layout only (no inline mode in v1)
 */
export function DiffViewer({
  original,
  modified,
  filePath,
  language,
  height = 400,
  theme = 'auto',
  showHeader = true,
}: DiffViewerProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { resolvedTheme } = useAppTheme();

  // Detect language from file path if not provided
  const detectedLanguage = language || (filePath ? detectLanguage(filePath) : 'plaintext');

  // Resolve theme
  const effectiveTheme = theme === 'auto' ? (resolvedTheme || 'dark') : theme;
  const monacoThemeName = effectiveTheme === 'light' ? 'claude-light' : 'claude-dark';

  // Update Monaco theme when it changes
  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(monacoThemeName);
    }
  }, [monaco, monacoThemeName]);

  // Define custom themes before mounting
  const handleEditorWillMount = (monaco: any) => {
    try {
      monaco.editor.defineTheme('claude-dark', editorDarkTheme);
      monaco.editor.defineTheme('claude-light', editorLightTheme);
    } catch (error) {
      console.warn('Failed to define Monaco themes:', error);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsReady(true);

    // Configure diff editor options after mount
    try {
      const diffNavigator = editor.getDiffNavigator?.();
      if (diffNavigator) {
        // Navigate to first change
        diffNavigator.next();
      }
    } catch (error) {
      console.warn('Failed to navigate to first diff:', error);
    }
  };

  const handleCopyModified = async () => {
    try {
      await navigator.clipboard.writeText(modified);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const fileName = filePath ? filePath.split('/').pop() : 'Diff';
  const isDark = effectiveTheme === 'dark';

  return (
    <div className="w-full h-full flex flex-col">
      {showHeader && (
        <div className={`flex items-center justify-between px-3 py-2 border-b ${
          isDark
            ? 'bg-gray-800 border-gray-700 text-gray-300'
            : 'bg-gray-100 border-gray-300 text-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {fileName}
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              (diff)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyModified}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title="Copy modified content"
            >
              {copied ? '✓ Copied' : 'Copy New'}
            </button>
          </div>
        </div>
      )}
      <div className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <DiffEditor
          height={showHeader ? '100%' : height}
          language={detectedLanguage}
          original={original}
          modified={modified}
          theme={monacoThemeName}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            renderSideBySide: true, // Side-by-side only (no inline mode in v1)
            enableSplitViewResizing: true,
            renderOverviewRuler: false,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            renderWhitespace: 'selection',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
            },
            // Diff-specific options
            ignoreTrimWhitespace: false,
            renderIndicators: true,
            originalEditable: false,
            diffWordWrap: 'off',
          }}
        />
      </div>
    </div>
  );
}
