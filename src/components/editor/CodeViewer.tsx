'use client';

import dynamic from 'next/dynamic';
import { EditorSkeleton } from './EditorSkeleton';
import { detectLanguage } from '@/lib/utils/languageDetection';

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
  /** Optional file path for language detection */
  filePath?: string;
  /** Explicit language ID (overrides detection) */
  language?: string;
  /** Height in pixels or CSS value */
  height?: number | string;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
}

/**
 * Code viewer component with syntax highlighting using Monaco Editor
 * Automatically detects language from file extension
 * Dynamically loaded to reduce initial bundle size
 */
export function CodeViewer({
  content,
  filePath,
  language,
  height,
  showLineNumbers = true,
}: CodeViewerProps) {
  // Detect language from file path if not explicitly provided
  const detectedLanguage = language || (filePath ? detectLanguage(filePath) : 'plaintext');

  return (
    <MonacoViewer
      content={content}
      language={detectedLanguage}
      height={height}
      showLineNumbers={showLineNumbers}
    />
  );
}
