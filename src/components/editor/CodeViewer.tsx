'use client';

import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import { EditorSkeleton } from './EditorSkeleton';
import { EditorErrorBoundary } from './EditorErrorBoundary';
import { detectLanguage } from '@/lib/utils/languageDetection';
import {
  isBinaryContent,
  isBinaryExtension,
  isLargeFile,
  getFileSizeDisplay,
} from '@/lib/utils/fileUtils';
import type { EditorTheme } from './MonacoViewer';
import { useAppTheme } from '@/hooks/useAppTheme';

// Dynamically import Monaco to avoid SSR issues and reduce initial bundle size
const MonacoViewer = dynamic(
  () => import('./MonacoViewer').then((mod) => ({ default: mod.MonacoViewer })),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

interface CodeViewerProps {
  /** The code content to display */
  content: string;
  /** Optional file path for language detection and display */
  filePath?: string;
  /** Explicit language ID (overrides detection) */
  language?: string;
  /** Height in pixels or CSS value */
  height?: number | string;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Show header with file path and actions (default: false) */
  showHeader?: boolean;
  /** Theme selection: 'light', 'dark', or 'auto' (default: 'dark') */
  theme?: EditorTheme;
  /** Optional callback for insert reference action */
  onInsertReference?: (text: string, startLine: number, endLine: number) => void;
  /** Optional callback for copy reference action */
  onCopyReference?: (text: string, startLine: number, endLine: number) => void;
  /** Optional callback for search codebase action */
  onSearchCodebase?: (text: string) => void;
  /** Optional callback when selection changes */
  onSelectionChange?: (text: string, startLine: number, endLine: number, position: { x: number; y: number }) => void;
}

/**
 * Placeholder component for binary files
 */
function BinaryFilePlaceholder({ filePath }: { filePath?: string }) {
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <div className={`w-full h-full flex items-center justify-center p-8 ${
      isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
    }`}>
      <div className="text-center">
        <div className="text-4xl mb-4">📦</div>
        <div className="text-lg font-semibold mb-2">Binary File</div>
        <div className="text-sm">
          {filePath ? `${filePath.split('/').pop()} ` : 'This file '}
          cannot be displayed as text
        </div>
      </div>
    </div>
  );
}

/**
 * Warning component for large files
 */
function LargeFileWarning({
  filePath,
  size,
  onShowAnyway,
}: {
  filePath?: string;
  size: string;
  onShowAnyway: () => void;
}) {
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <div className={`w-full h-full flex items-center justify-center p-8 ${
      isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
    }`}>
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-lg font-semibold mb-2">Large File</div>
        <div className="text-sm mb-4">
          {filePath ? `${filePath.split('/').pop()} ` : 'This file '}
          is {size}. Loading large files may impact performance.
        </div>
        <button
          onClick={onShowAnyway}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Show Anyway
        </button>
      </div>
    </div>
  );
}


/**
 * Code viewer component with syntax highlighting using Monaco Editor
 * Automatically detects language from file extension
 * Dynamically loaded to reduce initial bundle size
 * Includes error handling, binary file detection, and large file warnings
 */
export function CodeViewer({
  content,
  filePath,
  language,
  height,
  showLineNumbers = true,
  showHeader = false,
  theme = 'dark',
  onInsertReference,
  onCopyReference,
  onSearchCodebase,
  onSelectionChange,
}: CodeViewerProps) {
  // All hooks must be called before any conditional returns
  const [showLargeFile, setShowLargeFile] = useState(false);
  const [monacoFailed, setMonacoFailed] = useState(false);
  const { resolvedTheme } = useAppTheme();

  // Check for binary content and large files
  const isBinary = isBinaryExtension(filePath) || isBinaryContent(content);
  const isLarge = isLargeFile(content);
  const detectedLanguage = language || (filePath ? detectLanguage(filePath) : 'plaintext');

  // Conditional rendering based on checks
  if (isBinary) {
    return <BinaryFilePlaceholder filePath={filePath} />;
  }

  if (isLarge && !showLargeFile) {
    return (
      <LargeFileWarning
        filePath={filePath}
        size={getFileSizeDisplay(content)}
        onShowAnyway={() => setShowLargeFile(true)}
      />
    );
  }

  // If Monaco has failed repeatedly, show plain text fallback
  if (monacoFailed) {
    const isDark = resolvedTheme !== 'light';
    return (
      <div className="w-full h-full flex flex-col">
        <div className={`border-b px-3 py-2 text-sm ${
          isDark
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          Editor unavailable. Showing plain text.
        </div>
        <pre className={`flex-1 overflow-auto p-4 text-sm font-mono ${
          isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
        }`}>
          {content}
        </pre>
      </div>
    );
  }

  return (
    <EditorErrorBoundary content={content} language={detectedLanguage}>
      <MonacoViewer
        content={content}
        language={detectedLanguage}
        height={height}
        showLineNumbers={showLineNumbers}
        filePath={filePath}
        showHeader={showHeader}
        theme={theme}
        onInsertReference={onInsertReference}
        onCopyReference={onCopyReference}
        onSearchCodebase={onSearchCodebase}
        onSelectionChange={onSelectionChange}
      />
    </EditorErrorBoundary>
  );
}
