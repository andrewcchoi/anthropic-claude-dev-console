'use client';

import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';
import { editorTheme } from './editorTheme';

interface MonacoViewerProps {
  content: string;
  language: string;
  height?: number | string;
  showLineNumbers?: boolean;
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
}: MonacoViewerProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      // Define custom theme matching terminal colors
      monaco.editor.defineTheme('claude-dark', editorTheme);
    }
  }, [monaco]);

  return (
    <Editor
      height={height}
      language={language}
      value={content}
      theme="claude-dark"
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
      }}
    />
  );
}
