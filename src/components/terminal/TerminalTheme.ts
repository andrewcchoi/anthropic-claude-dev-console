import { ITheme } from 'xterm';

export const terminalTheme: ITheme = {
  background: '#1f2937', // gray-800
  foreground: '#e5e7eb', // gray-200
  cursor: '#60a5fa', // blue-400
  cursorAccent: '#1f2937',
  selectionBackground: '#3b82f680', // blue-500 with opacity

  // Standard ANSI colors (matching Tailwind)
  black: '#111827', // gray-900
  red: '#ef4444', // red-500
  green: '#10b981', // green-500
  yellow: '#f59e0b', // yellow-500
  blue: '#3b82f6', // blue-500
  magenta: '#a855f7', // purple-500
  cyan: '#06b6d4', // cyan-500
  white: '#e5e7eb', // gray-200

  // Bright ANSI colors
  brightBlack: '#4b5563', // gray-600
  brightRed: '#f87171', // red-400
  brightGreen: '#34d399', // green-400
  brightYellow: '#fbbf24', // yellow-400
  brightBlue: '#60a5fa', // blue-400
  brightMagenta: '#c084fc', // purple-400
  brightCyan: '#22d3ee', // cyan-400
  brightWhite: '#f9fafb', // gray-50
};
