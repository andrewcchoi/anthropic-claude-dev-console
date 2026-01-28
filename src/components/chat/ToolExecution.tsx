'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Terminal = dynamic(
  () => import('../terminal').then((mod) => mod.Terminal),
  { ssr: false }
);

interface ToolExecutionProps {
  name: string;
  input: any;
  output?: any;
  status: 'pending' | 'success' | 'error';
}

export function ToolExecution({
  name,
  input,
  output,
  status,
}: ToolExecutionProps) {
  const [expanded, setExpanded] = useState(false);

  // Helper function to extract bash output from various formats
  const getBashOutput = (output: any): string | null => {
    if (typeof output === 'string') return output;
    if (output && typeof output === 'object') {
      // Handle {stdout: "...", stderr: "..."} format
      if (output.stdout) return output.stdout;
      // Handle array format [{type: "text", text: "..."}]
      if (Array.isArray(output)) {
        return output
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
      }
    }
    return null;
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
      className={`mt-2 rounded border-l-4 ${getBorderColor()} border border-gray-300 bg-gray-50 overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-mono text-sm font-semibold">{name}</span>
        </div>
        <span className="text-xs text-gray-500">
          {expanded ? '▼' : '▶'}
        </span>
      </button>
      {expanded && (
        <div className="border-t px-3 py-2 space-y-2">
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">
              Input:
            </div>
            <pre className="text-xs bg-white p-2 rounded overflow-x-auto border border-gray-200">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {output && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">
                Output:
              </div>
              {(name === 'Bash' || name === 'bash') && getBashOutput(output) ? (
                <Terminal content={getBashOutput(output)!} minHeight={80} maxHeight={300} />
              ) : (
                <pre className="text-xs bg-white p-2 rounded overflow-x-auto border border-gray-200">
                  {typeof output === 'string'
                    ? output
                    : JSON.stringify(output, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
