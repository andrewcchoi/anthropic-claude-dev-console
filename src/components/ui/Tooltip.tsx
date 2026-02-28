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
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      // Check viewport edge
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const willOverflow = rect.right + 200 > window.innerWidth;
        setPosition(willOverflow ? 'left' : 'right');
        log.debug('Tooltip position calculated', { position: willOverflow ? 'left' : 'right', rect });
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
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`absolute z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg max-w-xs whitespace-normal ${
            position === 'right' ? 'left-full ml-2' : 'right-full mr-2'
          } top-0`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
