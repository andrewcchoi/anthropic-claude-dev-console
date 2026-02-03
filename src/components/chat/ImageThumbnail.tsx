'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ImageThumbnailProps {
  path: string;
  originalName: string;
  maxWidth?: number;
  maxHeight?: number;
}

export function ImageThumbnail({
  path,
  originalName,
  maxWidth = 300,
  maxHeight = 200,
}: ImageThumbnailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrl = `/api/uploads/serve?path=${encodeURIComponent(path)}`;

  return (
    <>
      <div className="inline-block">
        <button
          onClick={() => setIsExpanded(true)}
          className="relative block overflow-hidden rounded-lg border border-border bg-background hover:border-primary transition-colors"
          style={{ maxWidth, maxHeight }}
        >
          {isLoading && (
            <div
              className="flex items-center justify-center bg-muted"
              style={{ width: maxWidth, height: maxHeight }}
            >
              <div className="text-muted-foreground text-sm">Loading...</div>
            </div>
          )}
          {hasError && (
            <div
              className="flex items-center justify-center bg-destructive/10"
              style={{ width: maxWidth, height: maxHeight }}
            >
              <div className="text-destructive text-sm">Failed to load</div>
            </div>
          )}
          <img
            src={imageUrl}
            alt={originalName}
            className="max-w-full max-h-full object-contain"
            style={{ display: isLoading ? 'none' : 'block' }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </button>
        <p className="mt-1 text-xs text-muted-foreground truncate" style={{ maxWidth }}>
          {originalName}
        </p>
      </div>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={imageUrl}
              alt={originalName}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
