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
  onInsertReference?: (text: string, startLine: number, endLine: number) => void;
  onCopyReference?: (text: string, startLine: number, endLine: number) => void;
  onSearchCodebase?: (text: string) => void;
  onSelectionChange?: (text: string, startLine: number, endLine: number, position: { x: number; y: number }) => void;
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
  onInsertReference,
  onCopyReference,
  onSearchCodebase,
  onSelectionChange,
}: MonacoViewerProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);
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

  // Helper to get selection info
  const getSelectionInfo = (editor: any) => {
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return null;

    const text = editor.getModel()?.getValueInRange(selection);
    if (!text) return null;

    return {
      text,
      startLine: selection.startLineNumber,
      endLine: selection.endLineNumber,
    };
  };

  // Register Monaco actions and selection listener
  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const disposables: any[] = [];

    // Register Insert Reference action
    if (onInsertReference) {
      const insertAction = editor.addAction({
        id: 'insert-reference-to-chat',
        label: 'Insert Reference to Chat',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1,
        run: (ed: any) => {
          const info = getSelectionInfo(ed);
          if (info) {
            onInsertReference(info.text, info.startLine, info.endLine);
          }
        },
      });
      disposables.push(insertAction);
    }

    // Register Copy Reference action
    if (onCopyReference) {
      const copyAction = editor.addAction({
        id: 'copy-reference',
        label: 'Copy Reference',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 2,
        run: (ed: any) => {
          const info = getSelectionInfo(ed);
          if (info) {
            onCopyReference(info.text, info.startLine, info.endLine);
          }
        },
      });
      disposables.push(copyAction);
    }

    // Register Search Codebase action
    if (onSearchCodebase) {
      const searchAction = editor.addAction({
        id: 'search-codebase',
        label: 'Search Codebase',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 3,
        run: (ed: any) => {
          const info = getSelectionInfo(ed);
          if (info) {
            onSearchCodebase(info.text);
          }
        },
      });
      disposables.push(searchAction);
    }

    // Listen for selection changes to show toolbar
    if (onSelectionChange) {
      const selectionDisposable = editor.onDidChangeCursorSelection((e: any) => {
        const selection = e.selection;
        if (!selection || selection.isEmpty()) {
          // Clear toolbar when selection is empty
          return;
        }

        const text = editor.getModel()?.getValueInRange(selection);
        if (!text) return;

        // Get position for toolbar
        const endPosition = selection.getEndPosition();
        const coords = editor.getScrolledVisiblePosition(endPosition);
        if (!coords) return;

        const editorDom = editor.getDomNode();
        if (!editorDom) return;

        const rect = editorDom.getBoundingClientRect();
        const position = {
          x: rect.left + coords.left,
          y: rect.top + coords.top + coords.height + 5,
        };

        onSelectionChange(
          text,
          selection.startLineNumber,
          selection.endLineNumber,
          position
        );
      });
      disposables.push(selectionDisposable);
    }

    return () => {
      disposables.forEach((d) => d?.dispose?.());
    };
  }, [monaco, onInsertReference, onCopyReference, onSearchCodebase, onSelectionChange]);

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
            contextmenu: true,
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
