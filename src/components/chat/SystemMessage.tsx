'use client';

import { ChatMessage, SystemInfoContent } from '@/types/claude';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SystemMessageProps {
  message: ChatMessage;
}

export function SystemMessage({ message }: SystemMessageProps) {
  const [copied, setCopied] = useState(false);

  // Extract system_info content
  const systemInfo = message.content.find(
    (c) => c.type === 'system_info'
  ) as SystemInfoContent | undefined;

  if (!systemInfo) {
    return null;
  }

  const handleCopySessionId = async () => {
    if (systemInfo.sessionId) {
      await navigator.clipboard.writeText(systemInfo.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const connectedServers = systemInfo.mcpServers?.filter(s => s.status === 'connected').length || 0;
  const totalServers = systemInfo.mcpServers?.length || 0;

  return (
    <div className="flex justify-center px-4 py-6">
      <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-300">Session Initialized</h3>
          <span className="text-xs text-neutral-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Model */}
          {systemInfo.model && (
            <div>
              <div className="text-neutral-500 text-xs mb-1">Model</div>
              <div className="text-neutral-200 font-mono">{systemInfo.model}</div>
            </div>
          )}

          {/* Tools */}
          {systemInfo.toolCount !== undefined && (
            <div>
              <div className="text-neutral-500 text-xs mb-1">Tools</div>
              <div className="text-neutral-200">{systemInfo.toolCount} available</div>
            </div>
          )}

          {/* MCP Servers */}
          {systemInfo.mcpServers && systemInfo.mcpServers.length > 0 && (
            <div>
              <div className="text-neutral-500 text-xs mb-1">MCP Servers</div>
              <div className="text-neutral-200">
                {connectedServers}/{totalServers} connected
              </div>
            </div>
          )}

          {/* Permission Mode */}
          {systemInfo.permissionMode && (
            <div>
              <div className="text-neutral-500 text-xs mb-1">Permission Mode</div>
              <div className="text-neutral-200 capitalize">{systemInfo.permissionMode}</div>
            </div>
          )}

          {/* Working Directory */}
          {systemInfo.cwd && (
            <div className="col-span-2">
              <div className="text-neutral-500 text-xs mb-1">Working Directory</div>
              <div className="text-neutral-200 font-mono text-xs truncate">{systemInfo.cwd}</div>
            </div>
          )}

          {/* CLI Version */}
          {systemInfo.cliVersion && (
            <div>
              <div className="text-neutral-500 text-xs mb-1">CLI Version</div>
              <div className="text-neutral-200 font-mono text-xs">{systemInfo.cliVersion}</div>
            </div>
          )}

          {/* Session ID */}
          {systemInfo.sessionId && (
            <div className="col-span-2">
              <div className="text-neutral-500 text-xs mb-1">Session ID</div>
              <button
                onClick={handleCopySessionId}
                className="flex items-center gap-2 text-neutral-200 font-mono text-xs hover:text-neutral-100 transition-colors group"
                title="Click to copy full session ID"
              >
                <span className="truncate">{systemInfo.sessionId}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 text-neutral-500 group-hover:text-neutral-400 flex-shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* MCP Server Details */}
        {systemInfo.mcpServers && systemInfo.mcpServers.length > 0 && (
          <div className="pt-2 border-t border-neutral-800">
            <div className="text-neutral-500 text-xs mb-2">MCP Server Status</div>
            <div className="space-y-1">
              {systemInfo.mcpServers.map((server, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-mono">{server.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      server.status === 'connected'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {server.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
