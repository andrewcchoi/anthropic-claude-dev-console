/**
 * Monaco Editor-based code viewer components
 * @module components/editor
 */

export { CodeViewer } from './CodeViewer';
export { DiffViewer } from './DiffViewer';
export { EditorSkeleton } from './EditorSkeleton';
export { DiffViewerSkeleton } from './DiffViewerSkeleton';
export { EditorErrorBoundary } from './EditorErrorBoundary';
export { editorDarkTheme, editorLightTheme, editorTheme } from './editorTheme';
export type { EditorTheme } from './MonacoViewer';
export { detectLanguage } from '@/lib/utils/languageDetection';
