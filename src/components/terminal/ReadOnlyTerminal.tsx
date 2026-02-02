'use client';

import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { terminalTheme } from './TerminalTheme';

interface ReadOnlyTerminalProps {
  content: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Read-only terminal component for displaying tool output
 * Maintains backward compatibility with existing Bash tool output display
 */
export function ReadOnlyTerminal({
  content,
  className = '',
  minHeight = 100,
  maxHeight = 400
}: ReadOnlyTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const xterm = new XTerm({
      theme: terminalTheme,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: false,
      disableStdin: true, // Read-only
      allowTransparency: false,
      convertEol: true,
    });

    // Initialize addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // Open terminal in container
    xterm.open(terminalRef.current);

    // Write content
    xterm.write(content);

    // Fit to container
    fitAddon.fit();

    // Store references
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Setup ResizeObserver for responsive sizing
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [content]);

  return (
    <div
      className={`rounded border border-gray-600 overflow-hidden ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        backgroundColor: '#1f2937'
      }}
    >
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}
