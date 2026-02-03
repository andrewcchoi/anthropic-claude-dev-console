import { useState, useCallback } from 'react';
import { useChatStore } from '@/lib/store';

export interface SelectionInfo {
  text: string;
  startLine: number;
  endLine: number;
  filePath: string;
}

export interface ToolbarPosition {
  x: number;
  y: number;
}

export function useEditorSelection() {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
  const { setPendingInputText, setSearchQuery } = useChatStore();

  const formatReference = useCallback((sel: SelectionInfo): string => {
    const lineRange =
      sel.startLine === sel.endLine
        ? `:${sel.startLine}`
        : `:${sel.startLine}-${sel.endLine}`;
    return `@${sel.filePath}${lineRange}\n\n\`\`\`\n${sel.text}\n\`\`\``;
  }, []);

  const insertReference = useCallback((directSelection?: SelectionInfo) => {
    const sel = directSelection || selection;
    if (!sel) return;
    const reference = formatReference(sel);
    setPendingInputText(reference);
    // Clear selection and toolbar after inserting
    setSelection(null);
    setToolbarPosition(null);
  }, [selection, formatReference, setPendingInputText]);

  const copyReference = useCallback(async (directSelection?: SelectionInfo): Promise<boolean> => {
    const sel = directSelection || selection;
    if (!sel) return false;
    const reference = formatReference(sel);
    try {
      await navigator.clipboard.writeText(reference);
      // Clear selection and toolbar after copying
      setSelection(null);
      setToolbarPosition(null);
      return true;
    } catch (error) {
      console.error('Failed to copy reference:', error);
      return false;
    }
  }, [selection, formatReference]);

  const searchCodebase = useCallback((directSelection?: SelectionInfo) => {
    const sel = directSelection || selection;
    if (!sel) return;
    // Set search query - this will be sent to chat as a search request
    setSearchQuery(sel.text);
    // Clear selection and toolbar
    setSelection(null);
    setToolbarPosition(null);
  }, [selection, setSearchQuery]);

  const updateSelection = useCallback((sel: SelectionInfo | null, pos: ToolbarPosition | null) => {
    setSelection(sel);
    setToolbarPosition(pos);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setToolbarPosition(null);
  }, []);

  return {
    selection,
    toolbarPosition,
    insertReference,
    copyReference,
    searchCodebase,
    updateSelection,
    clearSelection,
  };
}
