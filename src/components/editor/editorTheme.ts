import type { editor } from 'monaco-editor';

/**
 * Monaco Editor dark theme matching the terminal's dark theme
 * Colors aligned with Tailwind gray-* palette
 */
export const editorDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: '60a5fa' }, // blue-400
    { token: 'string', foreground: '34d399' }, // emerald-400
    { token: 'number', foreground: 'fbbf24' }, // amber-400
    { token: 'type', foreground: 'a78bfa' }, // violet-400
    { token: 'function', foreground: 'f472b6' }, // pink-400
  ],
  colors: {
    'editor.background': '#1f2937', // gray-800
    'editor.foreground': '#e5e7eb', // gray-200
    'editorLineNumber.foreground': '#6b7280', // gray-500
    'editorLineNumber.activeForeground': '#9ca3af', // gray-400
    'editor.lineHighlightBackground': '#374151', // gray-700
    'editor.selectionBackground': '#374151', // gray-700
    'editor.inactiveSelectionBackground': '#374151', // gray-700
    'editorCursor.foreground': '#e5e7eb', // gray-200
    'editor.findMatchBackground': '#4b556344', // gray-600 with opacity
    'editor.findMatchHighlightBackground': '#37415144', // gray-700 with opacity
    'editorWidget.background': '#111827', // gray-900
    'editorWidget.border': '#374151', // gray-700
    'editorSuggestWidget.background': '#111827', // gray-900
    'editorSuggestWidget.border': '#374151', // gray-700
    'editorHoverWidget.background': '#111827', // gray-900
    'editorHoverWidget.border': '#374151', // gray-700
  },
};

/**
 * Monaco Editor light theme
 * Colors aligned with Tailwind gray-* palette
 */
export const editorLightTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' }, // gray-400
    { token: 'keyword', foreground: '3b82f6' }, // blue-500
    { token: 'string', foreground: '10b981' }, // emerald-500
    { token: 'number', foreground: 'f59e0b' }, // amber-500
    { token: 'type', foreground: '8b5cf6' }, // violet-500
    { token: 'function', foreground: 'ec4899' }, // pink-500
  ],
  colors: {
    'editor.background': '#ffffff', // white
    'editor.foreground': '#1f2937', // gray-800
    'editorLineNumber.foreground': '#9ca3af', // gray-400
    'editorLineNumber.activeForeground': '#6b7280', // gray-500
    'editor.lineHighlightBackground': '#f9fafb', // gray-50
    'editor.selectionBackground': '#e5e7eb', // gray-200
    'editor.inactiveSelectionBackground': '#f3f4f6', // gray-100
    'editorCursor.foreground': '#1f2937', // gray-800
    'editor.findMatchBackground': '#fef3c744', // amber-50 with opacity
    'editor.findMatchHighlightBackground': '#f3f4f644', // gray-100 with opacity
    'editorWidget.background': '#f9fafb', // gray-50
    'editorWidget.border': '#e5e7eb', // gray-200
    'editorSuggestWidget.background': '#f9fafb', // gray-50
    'editorSuggestWidget.border': '#e5e7eb', // gray-200
    'editorHoverWidget.background': '#f9fafb', // gray-50
    'editorHoverWidget.border': '#e5e7eb', // gray-200
  },
};

/**
 * Default theme (backward compatibility alias for dark theme)
 */
export const editorTheme = editorDarkTheme;
