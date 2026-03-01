'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('Tooltip');

interface TooltipProps {
  content: string;
  children: ReactNode;
  delay?: number;
}

export function Tooltip({ content, children, delay = 500 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showTooltip = (e: React.MouseEvent) => {
    timeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        // Position tooltip near mouse cursor, offset slightly
        let x = e.clientX + 10;
        let y = e.clientY - 40; // Above cursor

        // Viewport edge detection
        const tooltipWidth = 250; // max-w-xs ≈ 250px
        const tooltipHeight = 100; // estimated

        // Flip to left if would overflow right edge
        if (x + tooltipWidth > window.innerWidth) {
          x = e.clientX - tooltipWidth - 10;
        }

        // Flip below cursor if would overflow top edge
        if (y < 10) {
          y = e.clientY + 20;
        }

        setPosition({ x, y });
        log.debug('Tooltip position calculated', { x, y, clientX: e.clientX, clientY: e.clientY });
      }
      setVisible(true);
      log.debug('Tooltip shown', { content: content.slice(0, 50) });
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
    log.debug('Tooltip hidden');
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="inline-block w-full"
      onMouseMove={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip as any}
      onBlur={hideTooltip}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          style={{
            position: 'fixed', // Use fixed positioning relative to viewport
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 9999,
          }}
          className="px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg max-w-xs whitespace-normal pointer-events-none"
        >
          {content}
          {/* Optional: Add arrow pointer */}
          <div
            className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"
            style={{
              bottom: '-4px',
              left: '10px',
            }}
          />
        </div>
      )}
    </div>
  );
}
