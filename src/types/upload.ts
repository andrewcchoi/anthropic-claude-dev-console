export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  preview?: string;              // Data URL for client preview
  uploadedPath?: string;         // Server path after upload
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;      // 10MB per file
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024;     // 20MB total
export const MAX_FILES = 10;
