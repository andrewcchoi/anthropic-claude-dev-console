// Only export the Terminal facade component to avoid SSR issues
// ReadOnlyTerminal and InteractiveTerminal are dynamically imported internally
export { Terminal } from './Terminal';
export { terminalTheme } from './TerminalTheme';
