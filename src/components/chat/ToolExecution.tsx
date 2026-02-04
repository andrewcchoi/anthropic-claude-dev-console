'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CodeViewer } from '@/components/editor';
import { SelectionToolbar } from '@/components/editor/SelectionToolbar';
import { useEditorSelection } from '@/hooks/useEditorSelection';
import { serializeError } from '@/lib/utils/errorUtils';
import { shouldHighlightAsJson, formatJsonWithAnsi } from '@/lib/utils/jsonHighlight';
import { JsonViewer } from '@/components/ui/JsonViewer';

const Terminal = dynamic(
  () => import('../terminal').then((mod) => mod.Terminal),
  { ssr: false }
);

interface ToolInput {
  command?: string;
  cwd?: string;
  working_directory?: string;
  [key: string]: unknown;
}

interface ToolOutput {
  stdout?: string;
  stderr?: string;
  text?: string;
  type?: string;
  [key: string]: unknown;
}

interface ToolExecutionProps {
  name: string;
  input: ToolInput | string;
  output?: ToolOutput | ToolOutput[] | string;
  status: 'pending' | 'success' | 'error';
}

const BASH_TOOL_NAMES = ['Bash', 'bash'] as const;

export function ToolExecution({
  name,
  input,
  output,
  status,
}: ToolExecutionProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'readonly' | 'interactive'>('readonly');

  // Get file path for selection context
  const filePath = (input as ToolInput)?.file_path as string | undefined;

  // Use selection hook
  const {
    selection,
    toolbarPosition,
    insertReference,
    copyReference,
    searchCodebase,
    updateSelection,
    clearSelection,
  } = useEditorSelection();

  // Clear selection when panel is collapsed
  useEffect(() => {
    if (!expanded) {
      clearSelection();
    }
  }, [expanded, clearSelection]);

  // Callbacks for CodeViewer selection
  const handleInsertReference = (text: string, startLine: number, endLine: number) => {
    if (!filePath) return;
    insertReference({ text, startLine, endLine, filePath });
  };

  const handleCopyReference = (text: string, startLine: number, endLine: number) => {
    if (!filePath) return;
    copyReference({ text, startLine, endLine, filePath });
  };

  const handleSearchCodebase = (text: string) => {
    if (!filePath) return;
    searchCodebase({ text, startLine: 1, endLine: 1, filePath });
  };

  const handleSelectionChange = (
    text: string,
    startLine: number,
    endLine: number,
    position: { x: number; y: number }
  ) => {
    if (!filePath) return;
    updateSelection({ text, startLine, endLine, filePath }, position);
  };

  // Helper function to extract bash output from various formats
  const getBashOutput = (output: ToolOutput | ToolOutput[] | string | undefined): string | null => {
    if (!output) return null;
    if (typeof output === 'string') return output;

    if (Array.isArray(output)) {
      // Handle [{type: "text", text: "..."}] format
      const textContent = output
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n');
      if (textContent) return textContent;
    }

    if (typeof output === 'object') {
      // Handle {content: [{type: "text", text: "..."}]} format (agent results)
      if ('content' in output && Array.isArray((output as any).content)) {
        const contentArray = (output as any).content;
        const text = contentArray
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        if (text) return text;
      }

      // Handle {stdout: "...", stderr: "..."} format
      if ('stdout' in output) return output.stdout || '';
      if ('text' in output) return output.text || '';

      // Fallback: stringify unknown object formats
      return JSON.stringify(output, null, 2);
    }

    return String(output);
  };

  // Helper function to extract cwd from Bash tool input
  const getCwd = (input: ToolInput | string): string => {
    if (input && typeof input === 'object') {
      return input.cwd || input.working_directory || '/workspace';
    }
    return '/workspace';
  };

  // Check if this is a Bash tool
  const isBashTool = BASH_TOOL_NAMES.includes(name as typeof BASH_TOOL_NAMES[number]);
  const rawBashOutput = isBashTool ? getBashOutput(output) : null;

  // Apply JSON highlighting if output is valid JSON
  const bashOutput = rawBashOutput && shouldHighlightAsJson(rawBashOutput)
    ? formatJsonWithAnsi(rawBashOutput)
    : rawBashOutput;

  const cwd = isBashTool ? getCwd(input) : '/workspace';

  // Handle toggle between readonly and interactive
  const handleToggleInteractive = () => {
    setViewMode((prev) => (prev === 'readonly' ? 'interactive' : 'readonly'));
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <span className="animate-pulse">⚡</span>;
      case 'success':
        return <span className="text-green-500">✓</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'pending':
        return 'border-l-yellow-500';
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
    }
  };

  return (
    <div
      className={`mt-2 rounded border-l-4 ${getBorderColor()} border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {expanded ? '▼' : '▶'}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-300 dark:border-gray-600 px-3 py-2 space-y-2">
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Input:
            </div>
            <JsonViewer data={input} />
          </div>
          {output && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Output:
                </div>
                {isBashTool && bashOutput && status === 'success' && (
                  <div className="flex gap-1">
                    <button
                      onClick={handleToggleInteractive}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        viewMode === 'readonly'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Output
                    </button>
                    <button
                      onClick={handleToggleInteractive}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        viewMode === 'interactive'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Interactive ▶
                    </button>
                  </div>
                )}
              </div>
              {isBashTool && bashOutput ? (
                <Terminal
                  mode={viewMode}
                  content={bashOutput}
                  cwd={cwd}
                  minHeight={80}
                  maxHeight={300}
                />
              ) : (name === 'Read' || name === 'Edit') && typeof output === 'string' ? (
                <CodeViewer
                  content={output}
                  filePath={(input as ToolInput)?.file_path as string}
                  height={Math.min(400, output.split('\n').length * 19 + 16)}
                  showHeader={true}
                  theme="auto"
                  onInsertReference={handleInsertReference}
                  onCopyReference={handleCopyReference}
                  onSearchCodebase={handleSearchCodebase}
                  onSelectionChange={handleSelectionChange}
                />
              ) : (
                <JsonViewer
                  data={
                    typeof output === 'string'
                      ? output
                      : output instanceof Error
                      ? serializeError(output)
                      : output
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
      {/* Render toolbar when selection active */}
      {selection && toolbarPosition && (
        <SelectionToolbar
          position={toolbarPosition}
          selection={selection}
          onInsert={insertReference}
          onCopy={copyReference}
          onSearch={searchCodebase}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
