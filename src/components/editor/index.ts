/**
 * Monaco Editor-based code viewer components
 * @module components/editor
 */

export { CodeViewer } from './CodeViewer';
export { EditorSkeleton } from './EditorSkeleton';
export { EditorErrorBoundary } from './EditorErrorBoundary';
export { MonacoErrorSuppressor } from './MonacoErrorSuppressor';
export { editorDarkTheme, editorLightTheme, editorTheme } from './editorTheme';
export type { EditorTheme } from './MonacoViewer';
export { detectLanguage } from '@/lib/utils/languageDetection';
