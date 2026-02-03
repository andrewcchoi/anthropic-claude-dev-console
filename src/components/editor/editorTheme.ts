import type { editor } from 'monaco-editor';

/**
 * Monaco Editor theme matching the terminal's dark theme
 * Colors aligned with Tailwind gray-* palette
 */
export const editorTheme: editor.IStandaloneThemeData = {
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
