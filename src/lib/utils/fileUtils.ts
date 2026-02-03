/**
 * File utility functions for detecting binary content, file sizes, and extensions
 */

const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp', '.tiff', '.tif',
  // Videos
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
  // Audio
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz',
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.bin',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Databases
  '.db', '.sqlite', '.sqlite3',
  // Other binary formats
  '.pyc', '.pyo', '.class', '.o', '.a', '.lib',
]);

const LARGE_FILE_THRESHOLD = 500 * 1024; // 500KB in bytes

/**
 * Check if a file extension indicates a binary file
 */
export function isBinaryExtension(filePath: string | undefined): boolean {
  if (!filePath) return false;

  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? BINARY_EXTENSIONS.has(ext) : false;
}

/**
 * Check if content contains binary data by looking for null bytes or high ratio of non-printable characters
 */
export function isBinaryContent(content: string): boolean {
  // Check for null bytes (common in binary files)
  if (content.includes('\0')) {
    return true;
  }

  // Sample first 8KB for performance
  const sample = content.slice(0, 8192);
  let nonPrintable = 0;

  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    // Count non-printable characters (excluding common whitespace)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintable++;
    }
  }

  // If more than 30% non-printable, likely binary
  return nonPrintable / sample.length > 0.3;
}

/**
 * Check if content exceeds the large file threshold
 */
export function isLargeFile(content: string): boolean {
  // Rough byte estimation (UTF-16 string length)
  const byteLength = new Blob([content]).size;
  return byteLength > LARGE_FILE_THRESHOLD;
}

/**
 * Get human-readable file size display
 */
export function getFileSizeDisplay(content: string): string {
  const byteLength = new Blob([content]).size;

  if (byteLength < 1024) {
    return `${byteLength} B`;
  } else if (byteLength < 1024 * 1024) {
    return `${(byteLength / 1024).toFixed(1)} KB`;
  } else {
    return `${(byteLength / (1024 * 1024)).toFixed(1)} MB`;
  }
}
