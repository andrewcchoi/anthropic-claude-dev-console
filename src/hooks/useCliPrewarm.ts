import { useChatStore } from '@/lib/store';
import { SDKMessage, SystemInfoContent } from '@/types/claude';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/lib/logger';

const log = createLogger('useCliPrewarm');

export function useCliPrewarm() {
  const {
    setIsPrewarming,
    setPrewarmError,
    setInitInfo,
    addMessage,
    provider,
    providerConfig,
    defaultMode,
    preferredModel,
  } = useChatStore();

  const prewarmCli = async (sessionId: string) => {
    log.debug('Starting CLI pre-warm', { sessionId });
    setIsPrewarming(true);
    setPrewarmError(null);

    try {
      const response = await fetch('/api/claude/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cwd: '/workspace',
          model: preferredModel,
          provider,
          providerConfig,
          defaultMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pre-warm failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      let systemInfo: SystemInfoContent | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              log.debug('Pre-warm complete');
              continue;
            }

            try {
              const message: SDKMessage = JSON.parse(data);

              // Handle system.init message
              if (message.type === 'system' && message.subtype === 'init') {
                log.debug('Received init message', {
                  model: message.model,
                  toolCount: message.tools?.length,
                  mcpCount: message.mcp_servers?.length
                });

                // Store init info in store
                setInitInfo({
                  model: message.model,
                  sessionId: message.session_id,
                  tools: message.tools,
                  commands: message.slash_commands,
                  skills: message.skills,
                  mcpServers: message.mcp_servers,
                  cliVersion: message.claude_code_version,
                  cwd: message.cwd,
                  permissionMode: message.permissionMode,
                });

                // Build system info content
                systemInfo = {
                  type: 'system_info',
                  model: message.model,
                  sessionId: message.session_id,
                  toolCount: message.tools?.length || 0,
                  mcpServers: message.mcp_servers,
                  cliVersion: message.claude_code_version,
                  cwd: message.cwd,
                  permissionMode: message.permissionMode,
                };
              } else if (message.type === 'error') {
                throw new Error(message.error || 'Pre-warm failed');
              }
            } catch (e) {
              log.error('Failed to parse init message', { error: e });
            }
          }
        }
      }

      // Add system message to chat if we got init info
      if (systemInfo) {
        addMessage({
          id: uuidv4(),
          role: 'system',
          content: [systemInfo],
          timestamp: Date.now(),
        });
      }

      setIsPrewarming(false);
    } catch (error: any) {
      log.error('Pre-warm failed', { error });
      setPrewarmError(error.message || 'Failed to pre-warm CLI');
      setIsPrewarming(false);
    }
  };

  return { prewarmCli };
}
