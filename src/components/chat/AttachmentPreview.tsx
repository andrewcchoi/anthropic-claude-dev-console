'use client';

import { FileAttachment } from '@/types/upload';
import { X, Image, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AttachmentPreviewProps {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getStatusIcon = (status: FileAttachment['uploadStatus']) => {
    switch (status) {
      case 'pending':
        return null;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'uploaded':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-2 p-2 border border-border rounded-lg bg-muted/30">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative flex items-center gap-2 p-2 pr-8 rounded-md bg-background border border-border hover:border-primary transition-colors"
        >
          {/* Preview/Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
            {attachment.isImage && attachment.preview ? (
              <img
                src={attachment.preview}
                alt={attachment.name}
                className="w-full h-full object-cover"
              />
            ) : attachment.isImage ? (
              <Image className="h-6 w-6 text-muted-foreground" />
            ) : (
              <File className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* File info */}
          <div className="flex flex-col min-w-0 max-w-[200px]">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
            </p>
            {attachment.error && (
              <p className="text-xs text-destructive truncate">{attachment.error}</p>
            )}
          </div>

          {/* Status icon */}
          {getStatusIcon(attachment.uploadStatus) && (
            <div className="absolute top-2 right-8">
              {getStatusIcon(attachment.uploadStatus)}
            </div>
          )}

          {/* Remove button */}
          <button
            onClick={() => onRemove(attachment.id)}
            className="absolute top-2 right-2 p-0.5 rounded-full hover:bg-destructive/10 transition-colors"
            disabled={attachment.uploadStatus === 'uploading'}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
}
