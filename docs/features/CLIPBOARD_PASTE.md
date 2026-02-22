# Clipboard Paste Support

**Status:** ✅ Implemented (2026-02-22)
**Components:** ChatInput, useFileUpload
**Location:** `src/components/chat/ChatInput.tsx`, `src/hooks/useFileUpload.ts`

## Overview

Users can paste images and files directly into the chat textarea using Cmd/Ctrl+V. The feature supports cross-browser compatibility, security validation, and modern image formats.

## Features

### Supported File Types

| Category | Formats | MIME Types |
|----------|---------|------------|
| **Images** | PNG, JPG, JPEG, GIF, WebP, HEIC, AVIF | `image/*` (excluding SVG) |
| **Text** | TXT, MD, JSON, CSV | `text/*` |
| **Documents** | PDF | `application/pdf` |

### Security

- **SVG Exclusion**: SVG files (`image/svg+xml`) are blocked to prevent XSS attacks from embedded `<script>` tags
- **MIME Validation**: Files are validated by MIME type first, then by extension fallback
- **Size Limits**: Individual files limited to 10MB, total upload limited to 20MB
- **Count Limits**: Maximum 10 files per message

### User Experience

**Toast Notifications:**
- Success: "1 image added" or "3 files added"
- Partial rejection: "2 images added (1 unsupported skipped)"
- Error: "Unsupported file type. Allowed: images, text, PDF"
- Validation: "Maximum 10 files allowed" or "File exceeds 10MB limit"

**Behavior:**
- Text paste works normally (no interruption)
- Paste disabled during streaming (respects `disabled` prop)
- Multiple files can be pasted at once
- Unsupported files are silently skipped with count shown

## Implementation Details

### Cross-Browser Compatibility

Different browsers expose clipboard data differently:

```typescript
// Chrome/Firefox: clipboardData.items (DataTransferItemList)
if (clipboardData.items) {
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
}

// Safari fallback: clipboardData.files (FileList)
if (files.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
  files.push(...Array.from(clipboardData.files));
}
```

### Extension Fallback

Some browsers (especially on mobile or for certain file types) provide files with empty MIME types. The implementation falls back to extension checking:

```typescript
const isAllowedFile = (file: File) => {
  const type = file.type;
  // Exclude SVG for security
  if (type === 'image/svg+xml') return false;

  // MIME type check
  if (type.startsWith('image/') || type.startsWith('text/') || type === 'application/pdf') {
    return true;
  }

  // Extension fallback for empty MIME types
  if (!type) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['txt', 'md', 'json', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'heic', 'avif'].includes(ext || '');
  }
  return false;
};
```

### Preview Generation Fix

The `generatePreview()` function in `useFileUpload.ts` was updated to handle files with empty MIME types:

```typescript
const generatePreview = async (file: File): Promise<string | undefined> => {
  // Check both MIME type and extension (some browsers have empty MIME)
  const hasImageMime = file.type.startsWith('image/');
  const hasImageExt = isImageFile(file.name);
  if (!hasImageMime && !hasImageExt) {
    return undefined;
  }
  // ... FileReader logic
};
```

This ensures that images with valid extensions but empty MIME types still get thumbnail previews.

### Modern Image Format Support

Added to `IMAGE_EXTENSIONS` in `src/types/upload.ts`:

```typescript
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.avif'];
```

- **HEIC**: iPhone/iOS photo format (High Efficiency Image Container)
- **AVIF**: Modern web format with better compression than WebP

## Testing

### Manual Test Cases

1. **Screenshot paste (macOS)**: Cmd+Shift+4, then Cmd+V
   - ✅ Image thumbnail appears, toast shows "1 image added"

2. **Screenshot paste (Windows)**: Win+Shift+S, then Ctrl+V
   - ✅ Same as above

3. **Copy image from browser**: Right-click image > Copy Image, then paste
   - ✅ Same as above

4. **Text paste**: Copy text, paste in textarea
   - ✅ Text appears normally, no attachment created

5. **Mixed content**: Copy from rich text editor with images
   - ✅ Images extracted as attachments

6. **File count limit**: Add 10 files first, then paste another
   - ✅ Toast shows "Maximum 10 files allowed"

7. **Large image**: Paste >10MB screenshot
   - ✅ Toast shows size error

8. **Unsupported type**: Paste a file that's not image/text/PDF
   - ✅ Toast shows "Unsupported file type. Allowed: images, text, PDF"

9. **Partial rejection**: Paste mix of image + unsupported file
   - ✅ Toast shows "1 image added (1 unsupported skipped)"

10. **SVG paste**: Copy SVG file and paste
    - ✅ Rejected as unsupported type

11. **Paste while streaming**: Start a response, try to paste
    - ✅ Paste ignored (no action, no error)

12. **Rapid paste**: Paste multiple times quickly
    - ✅ All images added without race condition errors

13. **Safari browser**: Test on Safari (uses clipboardData.files)
    - ✅ Works same as Chrome/Firefox

14. **Empty MIME type**: Paste file with unknown type but valid extension
    - ✅ Falls back to extension check, accepts valid extensions

15. **HEIC image**: Paste iPhone photo (HEIC format)
    - ✅ Accepted and shown as image

16. **Preview for empty MIME**: Paste image with valid extension but empty MIME type
    - ✅ Preview thumbnail generated correctly

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Check `item.kind === 'file'`** | Distinguishes files from text in clipboard |
| **Check both `items` AND `files`** | Cross-browser compatibility (Chrome vs Safari) |
| **Filter by allowed MIME types** | Match the file input restrictions |
| **Exclude SVG** | Prevents XSS from embedded scripts |
| **Check `disabled` early** | Prevent paste during streaming |
| **Prevent default only for files** | Text paste continues to work normally |
| **Extension fallback** | Handle files with empty MIME type (some browsers) |
| **Reuse IMAGE_EXTENSIONS** | Match hook's isImageFile() pattern for consistency |
| **Update IMAGE_EXTENSIONS** | Add HEIC/AVIF for modern image support |
| **Fix generatePreview()** | Check both MIME and extension for preview generation |
| **Show rejection count** | User knows when some files were skipped |

## Related Components

- **ChatInput.tsx**: Main component with paste handler (`handlePaste`)
- **useFileUpload.ts**: File validation, preview generation, attachment state
- **AttachmentPreview.tsx**: Displays file thumbnails with remove buttons
- **types/upload.ts**: Type definitions and constants (IMAGE_EXTENSIONS, limits)

## Future Enhancements

- **Duplicate detection**: Prevent pasting the same file multiple times
- **Data URL images**: Support images embedded in HTML as data URLs
- **Mobile paste**: Improve iOS/Android clipboard behavior
- **Progress indicator**: Show upload progress for large files
- **Paste from clipboard manager**: Support third-party clipboard managers

## Troubleshooting

### Paste not working
1. Check browser console for errors
2. Verify `disabled` prop is not set (streaming in progress)
3. Test with simple screenshot paste first
4. Check browser clipboard permissions

### Files rejected
1. Verify file type is supported (images, text, PDF only)
2. Check file size (<10MB per file, <20MB total)
3. Check file count (<10 files total)
4. SVG files are intentionally blocked

### No preview shown
1. Check browser console for FileReader errors
2. Verify file is actually an image (not just image extension)
3. Check `generatePreview()` logic in useFileUpload.ts

### Cross-browser issues
1. Safari: Uses `clipboardData.files` instead of `items`
2. Mobile: May require different approach (contenteditable)
3. Firefox: May have different clipboard API behavior
