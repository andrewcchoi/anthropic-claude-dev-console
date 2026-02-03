import { useState, useCallback } from 'react';
import { FileAttachment, MAX_FILE_SIZE, MAX_TOTAL_SIZE, MAX_FILES, IMAGE_EXTENSIONS } from '@/types/upload';
import { v4 as uuidv4 } from 'uuid';

export function useFileUpload() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const isImageFile = (filename: string): boolean => {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  };

  const generatePreview = async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith('image/')) {
      return undefined;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(undefined);
      };
      reader.readAsDataURL(file);
    });
  };

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate file count
    if (attachments.length + fileArray.length > MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} files allowed`);
    }

    // Validate individual file sizes
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }
    }

    // Validate total size
    const currentTotal = attachments.reduce((sum, att) => sum + att.size, 0);
    const newTotal = fileArray.reduce((sum, file) => sum + file.size, 0);
    if (currentTotal + newTotal > MAX_TOTAL_SIZE) {
      throw new Error(`Total size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`);
    }

    // Create attachments with previews
    const newAttachments = await Promise.all(
      fileArray.map(async (file) => {
        const preview = await generatePreview(file);
        const attachment: FileAttachment = {
          id: uuidv4(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          isImage: isImageFile(file.name),
          preview,
          uploadStatus: 'pending',
        };
        return attachment;
      })
    );

    setAttachments((prev) => [...prev, ...newAttachments]);
  }, [attachments]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const updateAttachmentStatus = useCallback(
    (id: string, status: FileAttachment['uploadStatus'], error?: string, uploadedPath?: string) => {
      setAttachments((prev) =>
        prev.map((att) =>
          att.id === id ? { ...att, uploadStatus: status, error, uploadedPath } : att
        )
      );
    },
    []
  );

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    updateAttachmentStatus,
  };
}
