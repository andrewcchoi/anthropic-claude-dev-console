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
  const mousePositionRef = useRef({ x: 0, y: 0 });

  const handleMouseEnter = () => {
    // Clear any existing timeout to prevent multiple tooltips
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start new timeout for this tooltip
    timeoutRef.current = setTimeout(() => {
      if (containerRef.current && mousePositionRef.current) {
        const { x: mouseX, y: mouseY } = mousePositionRef.current;

        // Position tooltip near mouse cursor, offset slightly
        let x = mouseX + 10;
        let y = mouseY - 40; // Above cursor

        // Viewport edge detection
        const tooltipWidth = 300; // max-w-xs ≈ 300px (updated for longer content)
        const tooltipHeight = 100; // estimated

        // Flip to left if would overflow right edge
        if (x + tooltipWidth > window.innerWidth) {
          x = mouseX - tooltipWidth - 10;
        }

        // Flip below cursor if would overflow top edge
        if (y < 10) {
          y = mouseY + 20;
        }

        setPosition({ x, y });
      }
      setVisible(true);
      log.debug('Tooltip shown', { content: content.slice(0, 50) });
    }, delay);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Track mouse position for tooltip positioning
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const hideTooltip = () => {
    // Immediately clear timeout and hide tooltip
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
    log.debug('Tooltip hidden');
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={hideTooltip}
      onFocus={handleMouseEnter}
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
          className="px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg max-w-sm whitespace-pre-wrap pointer-events-none"
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
