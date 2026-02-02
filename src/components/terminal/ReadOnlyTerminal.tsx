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

    // Store references early for cleanup
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    let resizeObserver: ResizeObserver | null = null;
    let animationFrameId: number | null = null;
    let isOpened = false;

    // Wait for container to have dimensions before opening
    const openWhenReady = () => {
      const container = terminalRef.current;
      if (!container || isOpened) return;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Container has dimensions, safe to open
        xterm.open(container);
        isOpened = true;

        // Write content
        xterm.write(content);

        // Fit to container
        requestAnimationFrame(() => {
          fitAddon.fit();
        });

        // Setup ResizeObserver for responsive sizing
        resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
          }
        });
        resizeObserver.observe(container);
      } else {
        // Container not ready, try again next frame
        animationFrameId = requestAnimationFrame(openWhenReady);
      }
    };

    openWhenReady();

    // Cleanup
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
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
